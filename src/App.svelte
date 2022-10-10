<script lang="ts">
  import "./styles/index.scss";
  import Sidebar from "./lib/Sidebar.svelte";
  import Toast from "./lib/Toast.svelte";
  import store from "./store";
  import Bubbles from "./lib/Bubbles.svelte";
  import Queue from "./lib/transaction-queue/Queue.svelte";
  import Pill from "./lib/pill/Pill.svelte";
  import Router, { location } from "svelte-spa-router";
  import routes from "./routes";

  const reset = () => {
    $store.localStorage.setRpcUrl("https://mainnet.api.tez.ie");
    window.location.reload();
  };
</script>

<style lang="scss">
  .loading-text {
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    z-index: 100;
  }
</style>

<main>
  <Sidebar />
  {#if $store.isAppReady || $location === "settings"}
    <Router {routes} />
  {:else}
    <div class="loading-text">
      <p>Loading, please wait...</p>
      <p>&nbsp;</p>
      {#if $store.tokens}
        <p>
          <span class="material-icons-outlined"> check_circle </span>
          Token data downloaded!
        </p>
      {:else}
        <p>
          <span class="material-icons-outlined"> cancel </span>
          Downloading token data...
        </p>
      {/if}
      {#if $store.investments}
        <p>
          <span class="material-icons-outlined"> check_circle </span>
          DeFi platform data downloaded!
        </p>
      {:else}
        <p>
          <span class="material-icons-outlined"> cancel </span>
          Downloading DeFi platform data...
        </p>
      {/if}
      {#if $store.currentLevel > 0}
        <p>
          <span class="material-icons-outlined"> check_circle </span>
          Synced with the Tezos blockchain!
        </p>
      {:else}
        <p>
          <span class="material-icons-outlined"> cancel </span>
          Syncing with the Tezos blockchain...
        </p>
      {/if}
      {#if $store.xtzExchangeRate}
        <p>
          <span class="material-icons-outlined"> check_circle </span>
          XTZ exchange rate fetched!
        </p>
      {:else}
        <p>
          <span class="material-icons-outlined"> cancel </span>
          Fetching XTZ exchange rate...
        </p>
      {/if}
      <p>&nbsp;</p>
      <button class="primary mini" on:click={reset}> Reset </button>
    </div>
    <Bubbles />
  {/if}
</main>
<Toast />
<Queue />
<Pill />
