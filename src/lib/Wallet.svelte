<script lang="ts">
  import {
    onMount,
    afterUpdate,
    onDestroy,
    createEventDispatcher
  } from "svelte";
  import { TezosToolkit } from "@taquito/taquito";
  import { BeaconWallet } from "@taquito/beacon-wallet";
  import { Tzip16Module } from "@taquito/tzip16";
  import store from "../store";
  import Token from "../Token";
  import {
    shortenHash,
    fetchTezosDomain,
    formatTokenAmount,
    coinGeckoFetch,
    tzktTokensFetch,
    fetchDefiData
  } from "../utils";
  import type {
    TezosAccountAddress,
    State,
    AvailableInvestment,
    InvestmentData
  } from "../types";
  import { AvailableFiat, AvailableToken, AvailableDex } from "../types";
  import { TezToolsSDK } from "./teztools";
  import config from "../config";
  import { fetchAntiPrice } from "../tokenUtils/smartlinkUtils";
  import { LocalStorage } from "../localStorage";

  const dispatch = createEventDispatcher();

  const walletOptions = {
    name: "My Tezos DeFi",
    preferredNetwork: "mainnet"
    /*disableDefaultEvents: true, // Disable all events / UI. This also disables the pairing alert.
    eventHandlers: {
      // To keep the pairing alert, we have to add the following default event handlers back
      PAIR_INIT: {
        handler: "PAIR_INIT"
      },
      PAIR_SUCCESS: {
        handler: "PAIR_SUCCESS"
      }
    }*/
  };
  let wallet: BeaconWallet | undefined = undefined;
  let fetchBalanceInterval;
  let fetchCoinGeckoInterval;
  let fetchTeztoolsPricesInterval;
  let openWalletMenu = false;
  let connectedWallet = "";
  let connectedRpcUrl = "";

  const setup = async () => {
    $store.Tezos.setWalletProvider(wallet);
    const userAddress = (await wallet.getPKH()) as TezosAccountAddress;
    store.updateUserAddress(userAddress);
    store.updateWallet(wallet);
    store.updateLocalStorage(
      new LocalStorage(userAddress, $store.currentLevel)
    );
    let username = shortenHash(userAddress);
    username = await fetchTezosDomain($store.Tezos, userAddress);
    store.updateUserName(username);
    dispatch("new-user", userAddress);

    // fetches account data
    const userDetailsRes = await fetch(
      `https://api.tzkt.io/v1/accounts/${userAddress}`
    );
    if (userDetailsRes) {
      const userDetails = await userDetailsRes.json();
      if (userDetails.hasOwnProperty("balance")) {
        store.updateUserBalance(userDetails.balance);
      }
    }
    // fetches tokens
    const tokens = await tzktTokensFetch(
      userAddress,
      Object.values(AvailableToken)
    );
    if (tokens) {
      store.updateUserTokens(tokens);
    } else {
      store.updateUserTokens(undefined);
    }

    fetchBalanceInterval = setInterval(async () => {
      const balance = await $store.Tezos.tz.getBalance(userAddress);
      store.updateUserBalance(balance.toNumber());
    }, 10_000);
  };

  const connect = async () => {
    openWalletMenu = false;
    if ($store.wallet) {
      wallet = $store.wallet;
    } else {
      wallet = new BeaconWallet(walletOptions as any);
    }

    try {
      await wallet.requestPermissions({
        network: {
          type: "mainnet" as any,
          rpcUrl: $store.settings.rpcUrl
        }
      });
      await setup();
    } catch (err) {
      console.error(err);
    }
  };

  const disconnect = () => {
    $store.wallet.client.destroy();
    store.updateWallet(undefined);
    store.updateUserAddress(undefined);
    store.updateUserName(undefined);
  };

  onMount(async () => {
    // fetches DeFi data from Pinata
    try {
      // fetches data from the IPFS
      const defiData: {
        tokens: Omit<
          State["tokens"],
          "exchangeRate" | "thumbnail" | "websiteLink"
        >;
        investments: any;
      } = await fetchDefiData(
        $store.settings.defiData,
        config.version,
        true
        //forceDownloadDefiData
      );
      if (defiData) {
        if (defiData.tokens) {
          let tokens: [AvailableToken, Token][] = [];
          // stores tokens info
          Object.entries(defiData.tokens).forEach(
            ([tokenSymbol, tokenData]) => {
              if (tokenSymbol !== "sDAO") {
                tokens.push([
                  tokenSymbol as AvailableToken,
                  new Token({ ...tokenData, id: tokenSymbol })
                ]);
                // tokens.push([
                //   tokenSymbol as AvailableToken,
                //   {
                //     ...token,
                //     exchangeRate: null,
                //     thumbnail: undefined,
                //     websiteLink: undefined
                //   }
                // ]);
              }
            }
          );
          store.updateTokens(tokens);
        }

        if (defiData.investments) {
          Object.keys(defiData.investments).forEach(key => {
            defiData.investments[key].balance = 0;
          });
          store.updateInvestments(
            Object.entries(defiData.investments) as Array<
              [AvailableInvestment, InvestmentData]
            >
          );
        }

        if (defiData["wrap-staking"]) {
          // builds investment data for WRAP staking farms
          const investmentsWithWrapStaking = { ...$store.investments };
          defiData["wrap-staking"].forEach(
            farm =>
              (investmentsWithWrapStaking[`${farm.token}-XTZ-LM`] = {
                id: `${farm.token}-XTZ-LM`,
                platform: "wrap",
                type: "staking",
                address: farm.contract,
                decimals: 6,
                info: [],
                alias: `${farm.token}-XTZ LM pool`,
                icons: [farm.token, "XTZ"],
                rewardToken: AvailableToken.WRAP,
                liquidityToken: true
              })
          );
          store.updateInvestments(
            Object.entries(investmentsWithWrapStaking) as Array<
              [AvailableInvestment, InvestmentData]
            >
          );
        }

        if (defiData["wrap-fee-farming"]) {
          // builds investment data for WRAP fee farming
          const investmentsWithWrapFeeFarming = { ...$store.investments };
          defiData["wrap-fee-farming"].forEach(
            farm =>
              (investmentsWithWrapFeeFarming[`WRAP-${farm.token}-FM`] = {
                id: `WRAP-${farm.token}-FM`,
                platform: "wrap",
                type: "fee-farming",
                address: farm.contract,
                decimals: 8,
                info: [],
                alias: `${farm.token} Fee Farming`,
                icons: ["WRAP", farm.token],
                rewardToken: farm.token,
                liquidityToken: false
              })
          );
          store.updateInvestments(
            Object.entries(investmentsWithWrapFeeFarming) as Array<
              [AvailableInvestment, InvestmentData]
            >
          );
        }

        // creates QuipuSwap farms investment data
        if (defiData["quipu-farms"]) {
          const quipuFarms = defiData["quipu-farms"].map(farmData => [
            `QUIPU-FARM-${farmData.index}`,
            {
              id: `QUIPU-FARM-${farmData.index}`,
              platform: "quipuswap",
              address: config.quipuFarmsContract,
              decimals: 6,
              info: [
                farmData.lock === 0 ? "no-lock" : farmData.lock + "-day-lock"
              ],
              alias: `${farmData.tokens.join("-")} farm ${
                farmData.lock === 0
                  ? "(no lock)"
                  : "(" + farmData.lock + "-day lock)"
              }`,
              icons: farmData.tokens,
              rewardToken: AvailableToken.QUIPU,
              liquidityToken: true
            }
          ]);
          store.updateInvestments(
            quipuFarms as Array<[AvailableInvestment, InvestmentData]>
          );
        }
      } else {
        /*toastStore.addToast({
          type: "error",
          title: "IPFS Error",
          text: "Unable to load tokens and investments data from the IPFS",
          dismissable: true
        });*/
        console.error(
          "Unable to load tokens and investments data from the IPFS"
        );
      }
    } catch (error) {
      console.error(error);
    }

    const Tezos = new TezosToolkit(LocalStorage.getRpcUrl());
    Tezos.addExtension(new Tzip16Module());
    store.updateTezos(Tezos);

    wallet = new BeaconWallet(walletOptions as any);
    const activeAccount = await wallet.client.getActiveAccount();
    if (activeAccount) {
      await setup();

      const peers = await wallet.client.getPeers();
      if (peers && peers.length > 0) {
        connectedWallet = (peers[0] as any).icon;
      }

      fetchBalanceInterval = setInterval(async () => {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        store.updateUserBalance(balance.toNumber());
      }, 10_000);
    }
    // fetches XTZ price
    try {
      const { exchangeRate, priceHistoric } = await coinGeckoFetch(
        AvailableFiat.USD
      );
      store.updateXtzExchangeRate(exchangeRate);
      store.updatePriceHistoric(priceHistoric);
      fetchCoinGeckoInterval = setInterval(
        async () => await coinGeckoFetch(AvailableFiat.USD),
        10_000
      );
    } catch (error) {
      console.error(error);
    }
    // fetches token prices from TezTools
    const fetchTokensPrices = async (teztools: TezToolsSDK) => {
      await teztools.refresh();
      const tokens = teztools.getCurrentPrice(
        Object.values(AvailableToken).filter(tk => tk !== "ANTI")
      );
      Object.keys($store.tokens).forEach((tokenName: AvailableToken) => {
        const teztoolsToken = tokens.find(tk => tk.symbol === tokenName);
        if (teztoolsToken) {
          $store.tokens[tokenName].setExchangeRate([
            { dex: AvailableDex.QUIPU, rate: teztoolsToken.xtzPrice }
          ]);
        }
        // if (teztoolsToken) {
        //   return [
        //     tokenName,
        //     { ...tokenData, exchangeRate: teztoolsToken.xtzPrice }
        //   ];
        // } else {
        //   return [tokenName, tokenData];
        // }
      });
      const antiExchangeRate = await fetchAntiPrice($store.Tezos);
      if (antiExchangeRate) {
        $store.tokens.ANTI.setExchangeRate([
          {
            dex: AvailableDex.VORTEX,
            rate: antiExchangeRate / 10 ** $store.tokens.ANTI.decimals
          }
        ]);
      }
    };
    const teztools = new TezToolsSDK();
    await teztools.init();
    await fetchTokensPrices(teztools);
  });

  afterUpdate(() => {
    if (
      $store.tokens &&
      $store.investments &&
      $store.xtzExchangeRate &&
      $store.currentLevel &&
      !$store.isAppReady
    ) {
      // ap becomes available when tokens, investments, exchange rate and level are ready
      store.updateAppReady();
    }

    if ($store.Tezos) {
      connectedRpcUrl = $store.Tezos.rpc.getRpcUrl();
    }
  });

  onDestroy(() => {
    clearInterval(fetchBalanceInterval);
    clearInterval(fetchCoinGeckoInterval);
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  button.wallet {
    display: flex;
    font-size: 18px;
    padding: 10px 15px;
    margin-bottom: 20px;
    width: 100%;
    cursor: pointer;
    border: none;
    border-radius: $std-border-radius;
    transition: 0.3s;

    &.connect {
      justify-content: center;
      align-items: center;
      background-color: $pacific-blue;
      color: white;

      &:hover {
        background-color: $blue-green;
      }
    }

    &.disconnect {
      justify-content: space-between;
      align-items: center;
      background-color: $light-cyan;

      &:hover {
        background-color: $blizzard-blue;
      }

      img {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        margin-right: 10px;
      }
    }
  }

  .wallet-menu {
    position: absolute;
    top: 100%;
    left: 30px;
    background-color: white;
    padding: 0px 20px;
    border-radius: $std-border-radius;
    border: solid 1px $blizzard-blue;
    width: 300px;
    -webkit-box-shadow: 10px 10px 39px -20px rgba(184, 184, 184, 1);
    -moz-box-shadow: 10px 10px 39px -20px rgba(184, 184, 184, 1);
    box-shadow: 10px 10px 39px -20px rgba(184, 184, 184, 1);

    & > div {
      margin: 10px 0px;
    }

    img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
    }

    .wallet-menu__info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: $std-font-size;
      padding-bottom: 10px;
      border-bottom: solid 1px $blizzard-blue;

      .wallet-menu__info__icons {
        position: relative;

        #wallet-icon {
          position: absolute;
          top: 50%;
          left: 60%;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: white;
          border: solid 1px $blizzard-blue;
        }
      }
    }
  }
</style>

<div style="position:relative">
  {#if $store.userAddress}
    <button
      class="wallet disconnect"
      on:click={() => (openWalletMenu = !openWalletMenu)}
    >
      <img
        src={`https://services.tzkt.io/v1/avatars/${$store.userAddress}`}
        alt="identicon"
      />
      <div>
        <span>{$store.userName || "..."}</span>
        <br />
        <span>
          {#if $store.userBalance}
            {formatTokenAmount($store.userBalance / 10 ** 6)} ꜩ
          {/if}
        </span>
      </div>
      {#if openWalletMenu}
        <span class="material-icons-outlined"> expand_less </span>
      {:else}
        <span class="material-icons-outlined"> expand_more </span>
      {/if}
    </button>
    {#if openWalletMenu}
      <div class="wallet-menu">
        <div>My wallet</div>
        <div class="wallet-menu__info">
          <div class="wallet-menu__info__icons">
            <img
              src={`https://services.tzkt.io/v1/avatars/${$store.userAddress}`}
              alt="identicon"
            />
            {#if connectedWallet}
              <img id="wallet-icon" src={connectedWallet} alt="wallet-icon" />
            {/if}
          </div>
          <div>
            <span>{$store.userName || "..."}</span>
            <br />
            <span>
              {#if $store.userBalance}
                {formatTokenAmount($store.userBalance / 10 ** 6)} ꜩ
                {#if $store.xtzExchangeRate}
                  (${formatTokenAmount(
                    ($store.userBalance / 10 ** 6) * $store.xtzExchangeRate,
                    2
                  )})
                {/if}
              {/if}
            </span>
          </div>
        </div>
        {#if $store.Tezos}
          <div
            class="wallet-menu__info"
            style="font-size:0.9rem;flex-direction:column;align-items:flex-start"
          >
            <p>Connected to</p>
            <p>{connectedRpcUrl}</p>
          </div>
        {/if}
        <div class="wallet-menu__actions">
          <button class="transparent full" on:click={disconnect}>
            <span class="material-icons-outlined">
              account_balance_wallet
            </span>
            &nbsp; Disconnect
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <button class="wallet connect" on:click={connect}>
      <span class="material-icons-outlined"> account_balance_wallet </span>
      &nbsp; Connect wallet
    </button>
  {/if}
</div>
