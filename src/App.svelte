<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import store from "./store";
  import localStorageStore from "./localStorage";
  import { AvailableToken } from "./types";
  import type { State, TokenContract, Operation } from "./types";
  import Router from "svelte-spa-router";
  import routes from "./routes";
  import Menu from "./components/Menu/Menu.svelte";
  import Footer from "./components/Footer/Footer.svelte";
  import Header from "./components/Header/Header.svelte";
  import LiveTrafficWorker from "worker-loader!./livetraffic.worker";
  import config from "./config";
  import { createNewOpEntry } from "./utils";

  let Tezos: TezosToolkit;
  let coinGeckoInterval;
  let liveTrafficWorker;
  let appReady = false;

  const handleLiveTrafficWorker = async (msg: MessageEvent) => {
    if (msg.data.type === "live-traffic" && msg.data.msg) {
      const ops: Operation[] = [];
      msg.data.msg.forEach(op => {
        if (!$store.tokens) return;
        //console.log("Operation:", op);
        const newOp: Operation = createNewOpEntry(op, $store.tokens);
        ops.push(newOp);

        if (
          op.status === "applied" &&
          Object.values($store.tokens)
            .map(tk => tk.address)
            .includes(op.target.address) &&
          op?.parameter?.entrypoint === "transfer"
        ) {
          // a transaction was sent to a token contract
          //console.log("Transfer operation:", op);
          let updatedTokensBalances = { ...$store.tokensBalances };
          let token = Object.entries($store.tokens).find(
            tk => tk[1].address === op.target.address
          );
          if (!token) return;

          const paramValue = op.parameter.value;
          let userBalance = updatedTokensBalances[token[0]];
          if (Array.isArray(paramValue)) {
            // FA2
            paramValue.forEach(op => {
              if (op.from_ === $store.userAddress) {
                console.log("FA2 operation from user account:", op);
                // token transfer from the user
                op.txs.forEach(
                  tx => (userBalance -= +tx.amount / 10 ** token[1].decimals)
                );
              } else {
                // token transfer to the user
                op.txs.forEach(tx => {
                  if (tx.to_ === $store.userAddress) {
                    console.log("FA2 operation to user account:", op);
                    userBalance += +tx.amount / 10 ** token[1].decimals;
                  }
                });
              }
            });
          } else if (
            paramValue.hasOwnProperty("to") &&
            paramValue.hasOwnProperty("from") &&
            paramValue.hasOwnProperty("value")
          ) {
            // FA1.2
            if (paramValue.from === $store.userAddress) {
              console.log("FA1.2 operation from user account:", op);
              // token transfer from the user
              userBalance -= +paramValue.value / 10 ** token[1].decimals;
            } else if (paramValue.to === $store.userAddress) {
              console.log("FA1.2 operation to user account:", op);
              // token transfer to the user
              userBalance += +paramValue.value / 10 ** token[1].decimals;
            }
          }
          // updates balance
          updatedTokensBalances[token[0]] = userBalance < 0 ? 0 : userBalance;
          // updates balances
          store.updateTokensBalances(updatedTokensBalances);
        } else if (
          op.status === "applied" &&
          Object.values($store.investments)
            .map(inv => inv.address)
            .includes(op.target.address)
        ) {
          // one of the followed investments contracts
          const investment = Object.entries($store.investments).find(
            inv => inv[1].address === op.target.address
          );
          // PLENTY contracts
          if (investment[1].platform === "plenty") {
            if (
              op?.parameter?.entrypoint === "stake" &&
              op.sender.address === $store.userAddress
            ) {
              const value = +op.parameter.value;
              const newInvestments = {
                ...$store.investments,
                [investment[0]]: {
                  ...investment[1],
                  balance: +investment[1].balance + value
                }
              };
              store.updateInvestments(newInvestments);
              /*toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });*/
            } else if (
              op?.parameter?.entrypoint === "unstake" &&
              op.sender.address === $store.userAddress
            ) {
              console.log("Plenty unstake");
            }
          }
          // PAUL contracts
          if (investment[1].platform === "paul") {
            if (
              op?.parameter?.entrypoint === "join" &&
              op.sender.address === $store.userAddress
            ) {
              const value = +op.parameter.value.nat;
              const newInvestments = {
                ...$store.investments,
                [investment[0]]: {
                  ...investment[1],
                  balance: +investment[1].balance + value
                }
              };
              store.updateInvestments(newInvestments);
              /*toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });*/
            } else if (
              op?.parameter?.entrypoint === "quit" &&
              op.sender.address === $store.userAddress
            ) {
              console.log("Paul unstake");
            }
          }
          // kDAO contracts
          if (investment[1].platform === "kdao") {
            if (
              op?.parameter?.entrypoint === "deposit" &&
              op.sender.address === $store.userAddress
            ) {
              const value = +op.parameter.value;
              const newInvestments = {
                ...$store.investments,
                [investment[0]]: {
                  ...investment[1],
                  balance: +investment[1].balance + value
                }
              };
              store.updateInvestments(newInvestments);
              /*toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });*/
            } else if (
              op?.parameter?.entrypoint === "withdraw" &&
              op.sender.address === $store.userAddress
            ) {
              console.log("kDAO unstake");
            }
          }
        }
      });
      store.updateLastOperations(ops);
      store.updateCurrentLevel(ops[0].level);

      if ($store.userAddress) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
    } else if (msg.data.type === "init-last-ops") {
      // loads transactions from the last 5 blocks
      const ops: Operation[] = [];
      msg.data.msg.forEach(op => {
        const newOp: Operation = createNewOpEntry(op, $store.tokens);

        ops.push(newOp);
      });
      store.updateLastOperations(ops);
      store.updateCurrentLevel(ops[0].level);

      if ($store.userAddress) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
    }
  };

  onMount(async () => {
    let rpcUrl = $store.settings[$store.network].rpcUrl;
    if (window.localStorage) {
      const settingsStorage = window.localStorage.getItem("mtd");
      if (settingsStorage) {
        const settings = JSON.parse(settingsStorage);
        rpcUrl = settings.favoriteRpcUrl;
      }
    }

    Tezos = new TezosToolkit(rpcUrl);
    Tezos.setPackerProvider(new MichelCodecPacker());
    store.updateTezos(Tezos);

    let tokens: [AvailableToken, TokenContract][] = [];
    try {
      // fetches data from the IPFS
      const defiDataResponse = await fetch(
        `https://cloudflare-ipfs.com/ipfs/${$store.defiData}`
      );
      if (defiDataResponse) {
        const defiData: {
          tokens: Omit<
            State["tokens"],
            "exchangeRate" | "thumbnail" | "websiteLink"
          >;
          investments: any;
        } = await defiDataResponse.json();
        if (defiData.tokens) {
          // stores tokens info
          Object.entries(defiData.tokens).forEach(([tokenSymbol, token]) => {
            if (tokenSymbol !== "sDAO") {
              tokens.push([
                tokenSymbol as AvailableToken,
                {
                  ...token,
                  exchangeRate: null,
                  thumbnail: undefined,
                  websiteLink: undefined
                }
              ]);
            }
          });
        }

        if (defiData.investments) {
          // TO REMOVE LATER
          (defiData.investments["PLENTY-uUSD-LP"] = {
            id: "PLENTY-uUSD-LP",
            platform: "plenty",
            address: "KT1HSYQ9NLTQufuvNUwMhLY7B9TX8LDUfgsr",
            decimals: 18,
            info: [],
            alias: "Plenty-uUSD LP farm",
            icons: ["PLENTY", "uUSD"],
            token: "PLENTY",
            liquidityToken: true
          }),
            Object.keys(defiData.investments).forEach(key => {
              defiData.investments[key].balance = 0;
              defiData.investments[key].favorite =
                $localStorageStore &&
                $localStorageStore.favoriteInvestments &&
                $localStorageStore.favoriteInvestments.includes(key);
            });
          store.updateInvestments({
            ...defiData.investments
          });
        }
      }
      // fetches data from TezTools
      const tezToolsDataRes = await fetch(`https://api.teztools.io/v1/prices`);
      if (tezToolsDataRes && tezToolsDataRes.status === 200) {
        const tezToolsData = await tezToolsDataRes.json();
        // selects whitelisted tokens
        const availableTokens = Object.values(AvailableToken);
        const tezToolsTokens = tezToolsData.contracts.filter(contract =>
          availableTokens.includes(contract.symbol)
        );
        tokens = tokens.map(([tokenSymbol, tokenData]) => {
          let tezToolToken = tezToolsTokens.find(
            tk => tk.symbol === tokenSymbol
          );
          if (tezToolToken) {
            let tokenThumbnail = tezToolToken.thumbnailUri;
            if (tokenThumbnail && tokenThumbnail.includes("ipfs")) {
              tokenThumbnail = `https://cloudflare-ipfs.com/ipfs/${tezToolToken.thumbnailUri.replace(
                "ipfs://",
                ""
              )}`;
            } else if (tokenSymbol === "kUSD") {
              tokenThumbnail =
                "https://img.templewallet.com/insecure/fit/64/64/ce/0/plain/https://kolibri-data.s3.amazonaws.com/logo.png";
            }

            return [
              tokenSymbol,
              {
                ...tokenData,
                exchangeRate: tezToolToken.currentPrice,
                thumbnail: tokenThumbnail,
                websiteLink: tezToolToken.websiteLink
              }
            ];
          } else {
            return [tokenSymbol, tokenData];
          }
        });
        store.updateTokens(tokens);

        // fetches fiat exchange rate
        const coinGeckoFetch = async () => {
          const url = `https://api.coingecko.com/api/v3/coins/tezos/market_chart?vs_currency=${$localStorageStore.preferredFiat.toLowerCase()}&days=2`;
          const coinGeckoResponse = await fetch(url);
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
            if ($localStorageStore) {
              // saves the exchange rate in the local store
              localStorageStore.updateFiat(
                $localStorageStore.preferredFiat,
                xtzFiatExchangeRate
              );
            }
          } else {
            throw "No response from CoinGecko API";
          }
        };

        await coinGeckoFetch();
        coinGeckoInterval = setInterval(coinGeckoFetch, 600_000);

        // updates service fee for test version
        if (
          window.location.href.includes("localhost") ||
          window.location.href.includes("staging")
        ) {
          store.updateServiceFee(null);
        }

        appReady = true;
      }
    } catch (error) {
      console.error(error);
    }
  });

  afterUpdate(async () => {
    if (!liveTrafficWorker && $store.tokens && $store.investments) {
      // inits live traffic worker
      liveTrafficWorker = new LiveTrafficWorker();
      liveTrafficWorker.postMessage({
        type: "init",
        payload: [
          ...Object.values($store.tokens).map(tk => tk.address),
          ...Object.values($store.investments).map(inv => inv.address),
          ...config.lbContracts
        ]
      });
      liveTrafficWorker.onmessage = handleLiveTrafficWorker;
    }
  });
</script>

<style lang="scss">
  .general-container {
    display: grid;
    grid-template-rows: 10% 85% 5%;
  }
</style>

<main>
  <Menu />
  <div class="general-container">
    <Header />
    {#if appReady}
      <Router {routes} />
    {:else}
      Loading...
    {/if}
    <Footer />
  </div>
</main>
