<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import Box from "./Box.svelte";

  export let balancesInUsd: any, assetsType: "owned" | "general";

  let expandGeneralAssets = true;
  let loading = true;

  afterUpdate(() => {
    if (loading && Object.values($store.tokensBalances).some(el => el)) {
      // closes Other assets when user's balances are loaded
      expandGeneralAssets = false;
      loading = false;
    }
  });
</script>

<style lang="scss">
  .container-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
  }
</style>

<div class="container">
  <div class="title">
    {#if assetsType === "owned"}
      Your assets
    {:else if assetsType === "general" && Object.values($store.tokensBalances).some(el => el)}
      Other assets
    {:else}
      Assets
    {/if}
  </div>
  {#if assetsType === "general"}
    <div class="expand">
      <button on:click={() => (expandGeneralAssets = !expandGeneralAssets)}>
        {#if expandGeneralAssets}
          <span class="material-icons"> expand_less </span>
        {:else}
          <span class="material-icons"> expand_more </span>
        {/if}
      </button>
    </div>
  {/if}
  {#if assetsType === "general" && !expandGeneralAssets}
    <span on:click={() => (expandGeneralAssets = true)} style="cursor:pointer">
      Expand
    </span>
  {:else}
    <div class="container-grid">
      {#each Object.entries($store.tokens) as token}
        {#if assetsType === "owned" && $store.tokensBalances[token[0]]}
          <Box {assetsType} {token} {balancesInUsd} />
        {:else if assetsType === "general" && !$store.tokensBalances[token[0]]}
          <Box {assetsType} {token} {balancesInUsd} />
        {/if}
      {/each}
    </div>
  {/if}
</div>
