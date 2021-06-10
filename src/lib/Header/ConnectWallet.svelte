<script lang="ts">
  import { onMount } from "svelte";
  import { BeaconWallet } from "@taquito/beacon-wallet";
  import {
    NetworkType,
    BeaconEvent,
    defaultEventCallbacks
  } from "@airgap/beacon-sdk";
  import { char2Bytes, bytes2Char } from "@taquito/utils";
  import type { TezosAccountAddress } from "../../types";
  import store from "../../store";

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

  const connect = async () => {
    try {
      const wallet = new BeaconWallet(walletOptions);
      await wallet.requestPermissions({
        network: {
          type: walletOptions.preferredNetwork,
          rpcUrl: $store.settings[$store.network].rpcUrl
        }
      });
      const userAddress = await wallet.getPKH();
      store.updateUserAddress(userAddress as any);
      store.updateWallet(wallet);
      $store.Tezos.setWalletProvider(wallet);
      username = await fetchTezosDomain(userAddress);
      await searchUserTokens(userAddress as TezosAccountAddress);
    } catch (err) {
      console.error(err);
    }
  };

  const disconnect = () => {
    $store.wallet.client.destroy();
    store.updateWallet(undefined);
    store.updateUserAddress(undefined);
    $store.Tezos.setWalletProvider(undefined);
    // reset balances to zero
    const zeroBalances = { ...$store.tokensBalances };
    Object.keys($store.tokensBalances).forEach(
      token => (zeroBalances[token] = undefined)
    );
    store.updateTokensBalances(zeroBalances);
  };

  const searchUserTokens = async (userAddress: TezosAccountAddress) => {
    // search for user address in tokens ledgers
    const balances = await Promise.all(
      Object.entries($store.tokens).map(async (tokenInfo, i) => {
        const [tokenSymbol, token] = tokenInfo;
        const contract = await $store.Tezos.wallet.at(
          token.address[$store.network]
        );
        const storage = await contract.storage();
        // finds ledger in storage
        const ledgerPath = token.ledgerPath.split("/");
        const ledger =
          ledgerPath.length === 1
            ? storage[ledgerPath[0]]
            : [storage, ...ledgerPath].reduce(
                (storage: any, sub: any) => storage[sub]
              );
        //return [Object.keys($store.tokens)[i], ledger];
        let balance;
        if (
          token.ledgerKey === "address" &&
          (token.type == "fa1.2" || token.type == "fa2")
        ) {
          const user = await ledger.get(userAddress);
          if (user) {
            if (user.hasOwnProperty("balance")) {
              balance = user.balance.toNumber() / 10 ** token.decimals;
            } else {
              balance = user.toNumber() / 10 ** token.decimals;
            }
          } else {
            balance = undefined;
          }
        } else if (
          Array.isArray(token.ledgerKey) &&
          token.ledgerKey[0] === "address"
        ) {
          balance = await ledger.get({ 0: userAddress, 1: token.ledgerKey[1] });
          if (balance) {
            balance = balance.toNumber() / 10 ** token.decimals;
          }
        } else if (
          Array.isArray(token.ledgerKey) &&
          token.ledgerKey[1] === "address"
        ) {
          balance = await ledger.get(
            char2Bytes(`{ Pair "ledger" "${userAddress}" }`)
          );
        } else {
          balance = undefined;
        }

        return [tokenSymbol, balance];
      })
    );
    // updates token balances
    const newBalances = { ...$store.tokensBalances };
    balances.forEach(param => {
      newBalances[param[0]] = param[1];
    });
    console.log("balances:", newBalances);
    store.updateTokensBalances(newBalances);
  };

  const fetchTezosDomain = async (address: string): Promise<string> => {
    const contract = await $store.Tezos.wallet.at(tezosDomainContract);
    const storage: any = await contract.storage();
    const user = await storage.store.reverse_records.get(address);
    if (user) {
      return bytes2Char(user.name);
    } else {
      return address.slice(0, 5) + "..." + address.slice(-5);
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
      username = await fetchTezosDomain(userAddress);
      await searchUserTokens(userAddress as TezosAccountAddress);
    }
    $store.Tezos.setWalletProvider(wallet);
  });
</script>

<style lang="scss">
  button {
    appearance: none;
    border: solid 4px transparent;
    padding: 10px 20px;
    margin-left: 20px;
    font-size: 1.1rem;
    color: #f9fafb;
    font-family: "Signika", sans-serif;
    background-color: #4c1d95;
    border-radius: 10px;
    transition: 0.3s;
    cursor: pointer;

    &:hover {
      border: solid 4px #5b21b6;
    }
  }
</style>

{#if $store.userAddress}
  <div>
    {username}
  </div>
  <button on:click={disconnect}>Disconnect</button>
{:else}
  <button on:click={connect}>Connect</button>
{/if}
