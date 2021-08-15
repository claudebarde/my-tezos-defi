<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import Router from "svelte-spa-router";
  import routes from "./Routes/routes";
  import store from "./store";
  import historicDataStore from "./historicDataStore";
  import Header from "./lib/Header/Header.svelte";
  import Footer from "./lib/Footer/Footer.svelte";
  import LiveTrafficWorker from "worker-loader!./livetraffic.worker";
  import type { Operation, State } from "./types";
  import { AvailableToken } from "./types";
  import { createNewOpEntry } from "./utils";
  import localStorageStore from "./localStorage";
  import Toast from "./lib/Toast/Toast.svelte";
  import toastStore from "./lib/Toast/toastStore";
  import config from "./config";

  let appReady = false;
  let liveTrafficWorker;
  let lastAppVisibility = 0;
  let coinGeckoInterval, tokensDataInterval;

  const handleLiveTrafficWorker = async (msg: MessageEvent) => {
    if (msg.data.type === "live-traffic" && msg.data.msg) {
      const ops: Operation[] = [];
      /*const testOp = {
        id: "test",
        hash: "123456",
        level: 12355,
        timestamp: new Date().toISOString(),
        parameter: {
          entrypoint: "transfer",
          value: {
            from: "tz1Q9ZuET5i4Yuitu35m1WX5GA27ZpR5siFk",
            to: "tz1Me1MGhK7taay748h4gPnX2cXvbgL6xsYL",
            value: "2516000000000000000"
          }
        },
        sender: {
          address: "KT1QqjR4Fj9YegB37PQEqXUPHmFbhz6VJtwE",
          alias: "PLENTY staking"
        },
        target: {
          address: "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b",
          alias: "PLENTY"
        },
        amount: 0,
        status: "applied"
      };
      msg.data.msg.push(testOp);*/
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
              toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });
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
              toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });
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
              toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });
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

      if ($store.userAddress) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
    }
  };

  onMount(async () => {
    const Tezos = new TezosToolkit($store.settings[$store.network].rpcUrl);
    Tezos.setPackerProvider(new MichelCodecPacker());
    store.updateTezos(Tezos);

    // fetches data from the IPFS
    const defiDataResponse = await fetch(
      `https://cloudflare-ipfs.com/ipfs/${$store.defiData}`
    );
    if (defiDataResponse) {
      const defiData: {
        tokens: Omit<State["tokens"], "favorite">;
        investments: any;
      } = await defiDataResponse.json();
      if (defiData.tokens) {
        // updates store
        let tokens = [];
        Object.entries(defiData.tokens).map(([tokenSymbol, token]) => {
          tokens.push([
            tokenSymbol,
            {
              ...token,
              favorite:
                $localStorageStore &&
                $localStorageStore.favoriteTokens &&
                $localStorageStore.favoriteTokens.includes(tokenSymbol)
            }
          ]);
        });
        store.updateTokens(tokens);
        // exchange rates
        let exchangeRatesDefault = {};
        Object.keys(defiData.tokens).forEach(
          tk => (exchangeRatesDefault[tk] = undefined)
        );
        store.updateTokensExchangeRates(
          exchangeRatesDefault as State["tokensExchangeRates"]
        );
        // available investments
        store.updateInvestments(defiData.investments);
        // init historical data store
        historicDataStore.initTokens(
          Object.keys(defiData.tokens) as AvailableToken[]
        );
      }

      if (defiData.investments) {
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
    } else {
      toastStore.addToast({
        type: "error",
        text: "Unable to fetch dapp data",
        dismissable: false
      });
    }

    // fetches token data from TezTools
    const fetchTokensData = async () => {
      const tokensDataResponse = await fetch(
        `https://api.teztools.io/token/prices`
      );
      if (tokensDataResponse) {
        const tokensData = await tokensDataResponse.json();
        const availableTokenAddresses = Object.values($store.tokens).map(
          tk => tk.address
        );
        let exchangesRates = {};
        let availableTokenSymbols = Object.values(AvailableToken);
        tokensData.contracts
          .filter(tk => availableTokenAddresses.includes(tk.tokenAddress))
          .forEach(tk => {
            if (availableTokenSymbols.includes(tk.symbol)) {
              const tokenToTez = +tk.currentPrice.toFixed(5) / 1;
              const tezToToken = +(1 / tk.currentPrice).toFixed(5) / 1;

              exchangesRates[tk.symbol] = {
                tokenToTez: tokenToTez,
                tezToToken: tezToToken,
                realPriceInTez: tokenToTez,
                realPriceInToken: tezToToken
              };
              historicDataStore.updateToken(tk.symbol, {
                tokenToTez,
                tezToToken
              });
            }
          });
        store.updateTokensExchangeRates(
          exchangesRates as State["tokensExchangeRates"]
        );
        // saves the data into the session storage
        if (window.sessionStorage) {
          window.sessionStorage.setItem(
            "tez-tools-prices",
            JSON.stringify(tokensData)
          );
        }
      } else {
        toastStore.addToast({
          type: "error",
          text: "Unable to fetch tokens data",
          dismissable: false
        });
      }
    };

    await fetchTokensData();
    tokensDataInterval = setInterval(fetchTokensData, 600_000);

    // updates service fee for test version
    if (
      window.location.href.includes("localhost") ||
      window.location.href.includes("staging")
    ) {
      store.updateServiceFee(null);
    }

    // reloads some data when user comes back to the page
    /*lastAppVisibility = Date.now();
    document.addEventListener("visibilitychange", async () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() > lastAppVisibility + 3 * 60 * 1000
      ) {
        //console.log("app visibility:", lastAppVisibility);
        lastAppVisibility = Date.now();
      } else if (document.visibilityState === "visible") {
        lastAppVisibility = Date.now();
      }
    });*/
    appReady = true;
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

    /*if (!$localStorageStore && $store.userAddress) {
      // inits local storage
      localStorageStore.init($store.userAddress);
    }*/

    if (!$store.xtzData.exchangeRate && $localStorageStore) {
      // fetches XTZ exchange rate
      try {
        if (!$localStorageStore.preferredFiat) {
          throw "Unknown preferred fiat value";
        }

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
        };

        await coinGeckoFetch();
        coinGeckoInterval = setInterval(coinGeckoFetch, 600_000);
      } catch (error) {
        console.log(error);
        toastStore.addToast({
          type: "error",
          text: "Unable to fetch CoinGecko data",
          dismissable: false
        });
        return;
      }
    }
  });

  onDestroy(() => {
    clearInterval(coinGeckoInterval);
    clearInterval(tokensDataInterval);
  });
</script>

<style lang="scss">
  @import "./styles/settings.scss";

  :root {
    --toastContainerTop: auto;
    --toastContainerRight: auto;
    --toastContainerBottom: 8rem;
    --toastContainerLeft: calc(50vw - 8rem);
  }

  #under-construction {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 0.5rem;
    text-align: center;
    padding: 15px;
    border: solid 1px #f9fafb;
    border-radius: 50%;
  }

  main {
    width: 70%;
    margin: 0 auto;
    min-height: 100%;
    margin-bottom: -100px;
  }

  @media only screen and (max-width: $mobile-break-point) {
    main {
      width: 100%;
    }

    #under-construction {
      display: none;
    }
  }
</style>

<Header />
<div id="under-construction">
  <span class="material-icons"> construction </span><br />
  <span>Under <br /> construction</span>
</div>
<main>
  {#if appReady}
    <Router {routes} />
  {:else}
    <div>Loading...</div>
  {/if}
</main>
<Footer />
<Toast />
