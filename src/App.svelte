<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import Router from "svelte-spa-router";
  import routes from "./Routes/routes";
  import store from "./store";
  import historicDataStore from "./historicDataStore";
  import Main from "./Routes/Main.svelte";
  import Header from "./lib/Header/Header.svelte";
  import Footer from "./lib/Footer/Footer.svelte";
  import QuipuWorker from "worker-loader!./quipuswap.worker";
  import LiveTrafficWorker from "worker-loader!./livetraffic.worker";
  import type { Operation, TokenContract } from "./types";
  import { AvailableToken } from "./types";
  import { searchUserTokens, createNewOpEntry } from "./utils";

  let appReady = false;
  let quipuWorker, liveTrafficWorker;

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
    } else if (msg.data.type === "xtz-fiat-exchange-rate") {
      store.updateXtzFiatExchangeRate(msg.data.payload);
    }
  };

  const handleLiveTrafficWorker = async (msg: MessageEvent) => {
    if (msg.data.type === "live-traffic") {
      /*const addresses = [
        ...Object.values($store.tokens).map(
          token => token.address[$store.network]
        ),
        ...Object.values($store.investments).map(
          entry => entry.address[$store.network]
        )
      ];*/
      const ops: Operation[] = [];
      const balanceUpdateRequests: AvailableToken[] = [];
      msg.data.msg.forEach(op => {
        //console.log("Operation:", op);
        const newOp: Operation = createNewOpEntry(op, $store.tokens);

        ops.push(newOp);

        if (
          op.sender.address === $store.userAddress ||
          op.target.address === $store.userAddress
        ) {
          console.log("User operation:", op);
          if (
            op.sender.address === $store.userAddress &&
            Object.keys($store.investments)
              .filter(inv => inv.split("-")[0].toLowerCase() === "plenty")
              .map(inv => $store.investments[inv].address[$store.network])
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
                inv => inv.address[$store.network] === op.target.address
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
              .map(inv => $store.investments[inv].address[$store.network])
              .includes(op.target.address)
          ) {
            // user interacts with Quipuswap pool
            console.log("Quipuswap interaction:", op);
          }
        }
      });
      store.updateLastOperations(ops);

      if (balanceUpdateRequests.length > 0) {
        const tokensToUpdate: { [p: string]: TokenContract } = {};
        balanceUpdateRequests.forEach(token => {
          if (!tokensToUpdate.hasOwnProperty(token)) {
            tokensToUpdate[token] = $store.tokens[token];
          }
        });
        const newBalances = await searchUserTokens({
          Tezos: $store.Tezos,
          network: $store.network,
          userAddress: $store.userAddress,
          tokens: tokensToUpdate,
          tokensBalances: $store.tokensBalances
        });
        console.log("new balances:", newBalances, tokensToUpdate);
        store.updateTokensBalances(newBalances);
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

    // inits Quipuswap worker
    quipuWorker = new QuipuWorker();
    quipuWorker.postMessage({
      type: "init",
      payload: {
        tokens: $store.tokens,
        rpcUrl: $store.settings[$store.network].rpcUrl,
        network: $store.network
      }
    });
    quipuWorker.onmessage = handleQuipuWorker;

    // inits live traffic worker
    liveTrafficWorker = new LiveTrafficWorker();
    liveTrafficWorker.onmessage = handleLiveTrafficWorker;

    appReady = true;
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
