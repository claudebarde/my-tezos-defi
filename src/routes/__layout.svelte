<script>
  import "../styles/index.scss";
  import Sidebar from "$lib/Sidebar.svelte";
  import Toast from "$lib/Toast.svelte";
  import store from "../store";
</script>

<main>
  <Sidebar />
  {#if $store.isAppReady}
    <slot />
  {:else}
    <div>Loading, please wait...</div>
  {/if}
</main>
<Toast />
