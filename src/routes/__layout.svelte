<script>
  import "../styles/index.scss";
  import Sidebar from "$lib/Sidebar.svelte";
  import store from "../store";
</script>

<main>
  <Sidebar />
  {#if $store.isAppReady}
    <slot />
  {:else}
    <div>Loading...</div>
  {/if}
</main>
