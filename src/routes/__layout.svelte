<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import "../styles/index.scss";
  import Sidebar from "$lib/Sidebar.svelte";
  import Toast from "$lib/Toast.svelte";
  import store from "../store";

  let routeId;

  onMount(() => {
    // not doing that on mount creates a "window is not defined" error
    routeId = $page.routeId;
  });
</script>

<main>
  <Sidebar />
  {#if $store.isAppReady || routeId === "settings"}
    <slot />
  {:else}
    <div>Loading, please wait...</div>
  {/if}
</main>
<Toast />
