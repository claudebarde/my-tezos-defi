<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import Router from "svelte-spa-router";
  import routes from "./Routes/routes";
  import store from "./store";
  import historicDataStore from "./historicDataStore";
  import Header from "./lib/Header/Header.svelte";
  import Footer from "./lib/Footer/Footer.svelte";
  import QuipuWorker from "worker-loader!./quipuswap.worker";
  import LiveTrafficWorker from "worker-loader!./livetraffic.worker";
  import type { Operation, State, AvailableToken } from "./types";
  import { createNewOpEntry } from "./utils";
  import workersStore from "./workersStore";
  import localStorageStore from "./localStorage";

  let appReady = false;
  let quipuWorker, liveTrafficWorker;
  let lastAppVisibility = 0;
  let perfStart, perfEnd;

  const handleQuipuWorker = (msg: MessageEvent) => {
    if (msg.data.type === "exchange-rates") {
      const exchangeRates = msg.data.payload;
      //console.log(exchangeRates);
      const updatedTokensExchangeRates = { ...$store.tokensExchangeRates };
      exchangeRates.forEach(rate => {
        if (rate) {
          const data = {
            tezToToken: rate.tezToToken,
            tokenToTez: rate.tokenToTez,
            realPriceInTez: rate.realPriceInTez,
            realPriceInToken: rate.realPriceInToken
          };
          updatedTokensExchangeRates[rate.tokenSymbol] = data;
          // updates historic data
          historicDataStore.updateToken(rate.tokenSymbol, data);
        }
      });
      store.updateTokensExchangeRates(updatedTokensExchangeRates);

      if ($store.firstLoading) store.updateFirstLoading(false);

      // if tokens are favorite tokens, gets exchange rates for other tokens
      const exchangeRateTokens = exchangeRates
        .map(item => item.tokenSymbol)
        .sort();
      const favoriteTokens = $localStorageStore.favoriteTokens.sort();
      if (exchangeRateTokens.join("") === favoriteTokens.join("")) {
        quipuWorker.postMessage({
          type: "fetch-tokens-exchange-rates",
          payload: Object.entries($store.tokens).filter(
            token => !$localStorageStore.favoriteTokens.includes(token[0])
          )
        });
      }

      if (perfStart) {
        perfEnd = performance.now();
        console.log(
          `${exchangeRates.length} tokens loaded in ${Math.round(
            (perfEnd - perfStart) / 1000
          )} seconds`
        );
        perfStart = 0;
        perfEnd = 0;
      }
    } else if (msg.data.type === "xtz-fiat-exchange-rate") {
      const { xtzFiatExchangeRate, historicExchangeRates } = msg.data.payload;
      store.updateXtzFiatExchangeRate(xtzFiatExchangeRate);
      store.updateXtzDataHistoric(historicExchangeRates);
      // saves the exchange rate in the local store
      localStorageStore.updateFiat(
        $localStorageStore.preferredFiat,
        xtzFiatExchangeRate
      );
    } else if (msg.data.type === "no-tokens" && $store.tokens) {
      quipuWorker.postMessage({
        type: "fetch-tokens-exchange-rates",
        payload: Object.entries($store.tokens).filter(
          token => !token[1].favorite
        )
      });
    }
  };

  const handleLiveTrafficWorker = async (msg: MessageEvent) => {
    if (msg.data.type === "live-traffic") {
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
          updatedTokensBalances[token[0]] = userBalance;
          // updates balances
          store.updateTokensBalances(updatedTokensBalances);
        } else if (
          op.status === "applied" &&
          (op.sender.address === $store.userAddress ||
            op.target.address === $store.userAddress)
        ) {
          //console.log("User operation:", op);
          // Plenty GetReward
          // Plenty stake/unstake
          /*if (
            op.sender.address === $store.userAddress &&
            Object.keys($store.investments)
              .filter(inv => inv.split("-")[0].toLowerCase() === "plenty")
              .map(inv => $store.investments[inv].address)
              .includes(op.target.address)
          ) {
            if (op.parameter.entrypoint === "GetReward") {
              // user got his reward from a PLENTY farm/pool
              if (!balanceUpdateRequests.includes(AvailableToken.PLENTY)) {
                balanceUpdateRequests.push(AvailableToken.PLENTY);
              }
            } else if (
              op.parameter.entrypoint === "stake" ||
              op.parameter.entrypoint === "unstake"
            ) {
              // user staked or unstaked his tokens
              const investment = Object.values($store.investments).find(
                inv => inv.address === op.target.address
              );
              if (!balanceUpdateRequests.includes(investment.token)) {
                balanceUpdateRequests.push(investment.token);
              }
            }
          } else if (
            op.sender.address === $store.userAddress &&
            Object.keys($store.tokens).includes(op.target.alias) &&
            op.parameter.entrypoint === "transfer"
          ) {
            // user interacts with token contract
            if (!balanceUpdateRequests.includes(op.target.alias)) {
              balanceUpdateRequests.push(op.target.alias);
            }
          } else if (
            op.sender.address === $store.userAddress &&
            Object.keys($store.investments)
              .filter(inv => inv.split("-")[0].toLowerCase() === "quipuswap")
              .map(inv => $store.investments[inv].address)
              .includes(op.target.address)
          ) {
            // user interacts with Quipuswap pool
            console.log("Quipuswap interaction:", op);
          }*/
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
    perfStart = performance.now();

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
              favorite: $localStorageStore.favoriteTokens.includes(tokenSymbol)
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
    }

    // inits Quipuswap worker
    quipuWorker = new QuipuWorker();
    quipuWorker.postMessage({
      type: "init",
      payload: {
        tokens: Object.entries($store.tokens).filter(
          token => token[1].favorite
        ),
        rpcUrl: $store.settings[$store.network].rpcUrl,
        network: $store.network,
        fiat: $localStorageStore.preferredFiat
      }
    });
    quipuWorker.onmessage = handleQuipuWorker;
    // saves quipuWorker
    workersStore.updateQuipuWorker(quipuWorker);

    // reloads some data when user comes back to the page
    lastAppVisibility = Date.now();
    document.addEventListener("visibilitychange", async () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() > lastAppVisibility + 3 * 60 * 1000
      ) {
        //console.log("app visibility:", lastAppVisibility);
        lastAppVisibility = Date.now();
        // refreshes tokens exchange rates
        quipuWorker.postMessage({
          type: "fetch-tokens-exchange-rates",
          payload: Object.entries($store.tokens)
        });
        // refreshes XTZ balance
        if ($store.userAddress) {
          const balance = await $store.Tezos.tz.getBalance($store.userAddress);
          if (balance) {
            store.updateTezBalance(balance.toNumber());
          }
        }
      } else if (document.visibilityState === "visible") {
        lastAppVisibility = Date.now();
      }
    });

    appReady = true;
  });

  afterUpdate(() => {
    if (!liveTrafficWorker && $store.tokens) {
      // inits live traffic worker
      liveTrafficWorker = new LiveTrafficWorker();
      liveTrafficWorker.postMessage({
        type: "init",
        payload: $store.tokens
      });
      liveTrafficWorker.onmessage = handleLiveTrafficWorker;
    }
  });

  onDestroy(() => {
    quipuWorker.postMessage({
      type: "destroy"
    });
  });
</script>

<style lang="scss">
  @import "./styles/settings.scss";

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
