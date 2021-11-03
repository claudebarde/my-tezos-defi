<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fly } from "svelte/transition";
  import { BeaconWallet } from "@taquito/beacon-wallet";
  import {
    NetworkType,
    BeaconEvent,
    defaultEventCallbacks
  } from "@airgap/beacon-sdk";
  import { bytes2Char } from "@taquito/utils";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import type { TezosAccountAddress } from "../../types";
  import { AvailableFiat } from "../../types";
  import { shortenHash, formatTokenAmount } from "../../utils";
  import config from "../../config";
  import Calculator from "../Calculator/Calculator.svelte";

  const walletOptions = {
    name: "My Tezos DeFi",
    preferredNetwork:
      $store.network === "mainnet"
        ? NetworkType.MAINNET
        : NetworkType.FLORENCENET,
    disableDefaultEvents: true, // Disable all events / UI. This also disables the pairing alert.
    eventHandlers: {
      // To keep the pairing alert, we have to add the following default event handlers back
      [BeaconEvent.PAIR_INIT]: {
        handler: defaultEventCallbacks.PAIR_INIT
      },
      [BeaconEvent.PAIR_SUCCESS]: {
        handler: defaultEventCallbacks.PAIR_SUCCESS
      }
    }
  };
  const tezosDomainContract = "KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS";
  let username = "";
  let showAvailableFiats = false;
  let showBalanceInFiat = false;

  const fetchTezosDomain = async (address: string): Promise<string> => {
    try {
      const contract = await $store.Tezos.wallet.at(tezosDomainContract);
      const storage: any = await contract.storage();
      const user = await storage.store.reverse_records.get(address);
      if (user) {
        return bytes2Char(user.name);
      } else {
        return address.slice(0, 5) + "..." + address.slice(-5);
      }
    } catch (error) {
      console.error(
        "Failed to fetch Tezos domain contract or username with error:",
        error
      );
      return address.slice(0, 5) + "..." + address.slice(-5);
    }
  };

  const connect = async () => {
    let wallet;
    if ($store.wallet) {
      wallet = $store.wallet;
    } else {
      wallet = new BeaconWallet(walletOptions as any);
    }

    try {
      await wallet.requestPermissions({
        network: {
          type: NetworkType.MAINNET,
          rpcUrl: $store.settings[$store.network].rpcUrl
        }
      });
      $store.Tezos.setWalletProvider(wallet);
      const userAddress = await wallet.getPKH();
      localStorageStore.init(userAddress);
      store.updateUserAddress(userAddress);
      username = shortenHash(userAddress);
      username = await fetchTezosDomain(userAddress);
    } catch (err) {
      console.error(err);
    }
  };

  const disconnect = () => {
    $store.wallet.client.destroy();
    store.updateWallet(undefined);
    store.updateUserAddress(undefined);
  };

  const changeFiat = async newFiat => {
    if (
      newFiat !== $localStorageStore.preferredFiat &&
      Object.keys(AvailableFiat).includes(newFiat)
    ) {
      localStorageStore.updateFiat(newFiat, 0);

      const coinGeckoResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/tezos/market_chart?vs_currency=${newFiat}&days=2`
      );
      if (coinGeckoResponse) {
        const data = await coinGeckoResponse.json();
        const prices = data.prices;
        const xtzFiatExchangeRate = prices[prices.length - 1][1];
        store.updateXtzFiatExchangeRate(xtzFiatExchangeRate);
        store.updateXtzDataHistoric(
          prices.map(price => ({
            timestamp: price[0],
            rate: price[1]
          }))
        );
        if ($localStorageStore && $store.userAddress) {
          // saves the exchange rate in the local store
          localStorageStore.updateFiat(
            $localStorageStore.preferredFiat,
            xtzFiatExchangeRate
          );
        }
      } else {
        throw "No response from CoinGecko API";
      }
      showAvailableFiats = false;
    }
  };

  onMount(async () => {
    // initializes the wallet
    const wallet = new BeaconWallet(walletOptions as any);
    const activeAccount = await wallet.client.getActiveAccount();
    if (activeAccount) {
      const userAddress = await wallet.getPKH();
      store.updateUserAddress(userAddress as TezosAccountAddress);
      store.updateWallet(wallet);
      $store.Tezos.setWalletProvider(wallet);
      localStorageStore.init(userAddress);

      username = shortenHash(userAddress);
      username = await fetchTezosDomain(userAddress);

      setInterval(async () => {
        const balance = await $store.Tezos.tz.getBalance(userAddress);
        store.updateTezBalance(balance.toNumber());
      }, 1000);
    } else {
      localStorageStore.init();
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  header {
    border-bottom: solid 2px $border-color;
    display: flex;
    justify-content: space-between;
    align-items: center;

    #change-fiat {
      position: relative;

      #select-fiat {
        z-index: 100;
        width: 440px;
        min-height: 200px;
        border: none;
        border-radius: 10px;
        position: absolute;
        top: 70px;
        right: 0px;
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        justify-content: flex-start;
        align-items: center;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
          rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
        background-color: white;

        .fiat-selection {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          margin: 5px;
          cursor: pointer;
          transition: 0.3s;
          border-radius: 5px;
          height: 1rem;

          img {
            height: 1rem;
          }

          &:hover {
            background-color: lighten($container-bg-color, 60);
          }
        }
      }
    }
  }
</style>

<header>
  <div>
    {#if $store.userAddress}
      <div class="buttons">
        <button class="primary" on:click={disconnect}>
          <img
            src={`https://services.tzkt.io/v1/avatars/${$store.userAddress}`}
            style="width: 30px;height:30px"
            alt="user-avatar"
          />
          &nbsp; {username}
        </button>
        <button
          class="primary"
          on:click={() => (showBalanceInFiat = !showBalanceInFiat)}
        >
          <span class="material-icons"> account_balance </span>
          &nbsp;
          {#if showBalanceInFiat}
            {formatTokenAmount(
              ($store.xtzData.balance / 10 ** 6) * $store.xtzData.exchangeRate,
              2
            )}
            {$localStorageStore.preferredFiat}
          {:else}
            {formatTokenAmount($store.xtzData.balance / 10 ** 6, 2)} ꜩ
          {/if}
        </button>
      </div>
    {/if}
  </div>
  <div style="display:flex">
    <div>
      {#if $store.xtzData.exchangeRate && Object.values(config.validFiats)
          .map(fiat => fiat.code)
          .includes($localStorageStore.preferredFiat)}
        <button class="primary" disabled>
          {+$store.xtzData.exchangeRate.toFixed(3) / 1}
          {$localStorageStore.preferredFiat}
        </button>
      {/if}
    </div>
    <Calculator />
    <div id="change-fiat">
      {#if $localStorageStore}
        <button
          class="primary"
          on:click={() => (showAvailableFiats = !showAvailableFiats)}
        >
          {#if Object.values(config.validFiats)
            .map(fiat => fiat.code)
            .includes($localStorageStore.preferredFiat)}
            <img
              src={`images/transferwise-currency-flags/${$localStorageStore.preferredFiat}.png`}
              alt={$localStorageStore.preferredFiat}
            />
            &nbsp; {$localStorageStore.preferredFiat}
            <span class="material-icons"> arrow_drop_down </span>
          {:else}
            <img src={`images/transferwise-currency-flags/usd.png`} alt="USD" />
            &nbsp; USD
            <span class="material-icons"> arrow_drop_down </span>
          {/if}
        </button>
        {#if showAvailableFiats}
          <div id="select-fiat" transition:fly={{ duration: 400, y: 100 }}>
            {#each config.validFiats as fiat}
              <div
                class="fiat-selection"
                on:click={() => changeFiat(fiat.code)}
              >
                <img
                  src={`images/transferwise-currency-flags/${fiat.code.toLowerCase()}.png`}
                  alt={`${fiat.code}-flag`}
                />
                &nbsp; {fiat.name}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
    {#if !$store.userAddress}
      <button class="primary" on:click={connect}> Connect </button>
    {/if}
  </div>
</header>
