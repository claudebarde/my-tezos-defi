<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import store from "./store";
  import Main from "./Main.svelte";
  import Header from "./lib/Header/Header.svelte";
  import QuipuWorker from "worker-loader!./quipuswap.worker";
  import type { TokenContract } from "./types";

  let appReady = false;
  let quipuWorker;

  const handleQuipuWorker = (msg: MessageEvent) => {
    console.log(msg);
    if (msg.data.type === "exchange-rates") {
      const exchangeRates = msg.data.payload;
      const updatedTokensExchangeRates = { ...$store.tokensExchangeRates };
      exchangeRates.forEach(rate => {
        updatedTokensExchangeRates[rate[0]] = {
          tezToToken: rate[1],
          tokenToTez: rate[2]
        };
      });
      store.updateTokensExchangeRates(updatedTokensExchangeRates);
    } else if (msg.data.type === "xtz-fiat-exchange-rate") {
      store.updateXtzFiatExchangeRate(msg.data.payload);
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

    // loads token storages
    const tokens = $store.tokens;
    const tokenContracts: TokenContract[] = Object.values(tokens);
    const storages = await Promise.all(
      tokenContracts.map(tk =>
        Tezos.wallet
          .at(tk.address[$store.network])
          .then(contract => contract.storage())
          .catch(_ => undefined)
      )
    );
    store.updateTokens(
      storages.map((storage, i) => {
        if (storage) {
          return [Object.keys(tokens)[i], { ...tokenContracts[i], storage }];
        }
      })
    );

    appReady = true;
  });

  onDestroy(() => {
    quipuWorker.postMessage({
      type: "destroy"
    });
  });
</script>

<style lang="scss">
  main {
    width: 60%;
    margin: 0 auto;
  }
</style>

<Header />
<main>
  {#if appReady}
    <Main />
  {:else}
    <div>Loading...</div>
  {/if}
</main>
