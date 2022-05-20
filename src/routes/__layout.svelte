<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "../styles/index.scss";
  import Sidebar from "$lib/Sidebar.svelte";
  import Toast from "$lib/Toast.svelte";
  import store from "../store";
  import Bubbles from "$lib/Bubbles.svelte";

  let routeId;

  onMount(() => {
    // not doing that on mount creates a "window is not defined" error
    routeId = $page.routeId;
  });
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
  }
</style>

<main>
  <Sidebar />
  {#if $store.isAppReady || routeId === "settings"}
    <slot />
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
    </div>
    <Bubbles />
  {/if}
</main>
<Toast />
