<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import Box from "./Box.svelte";
  import StickyHeader from "./StickyHeader.svelte";

  export let balancesInUsd: any, assetsType: "owned" | "general";

  let expandGeneralAssets = true;
  let loading = true;
  let ticking = false;
  let showStickyHeader = false;

  const updateStickyHeaderDisplay = lastKnownScrollPosition => {
    const container = document.getElementById("container-owned-tokens");
    if (container) {
      const containerPos = container.getBoundingClientRect();
      /*console.log(
        lastKnownScrollPosition,
        containerPos.top,
        container.clientHeight
      );*/
      if (
        Math.abs(containerPos.top) > container.clientHeight &&
        lastKnownScrollPosition > containerPos.top
      ) {
        showStickyHeader = true;
      } else {
        showStickyHeader = false;
      }
    }
  };

  onMount(() => {
    if (assetsType === "owned") {
      document.addEventListener("scroll", function (e) {
        const lastKnownScrollPosition = window.scrollY;

        if (!ticking) {
          window.requestAnimationFrame(function () {
            updateStickyHeaderDisplay(lastKnownScrollPosition);
            ticking = false;
          });

          ticking = true;
        }
      });
    }
  });

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

<div
  class="container"
  id={assetsType === "owned"
    ? "container-owned-tokens"
    : "container-general-tokens"}
>
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
    <span
      on:click={() => (expandGeneralAssets = true)}
      style="cursor:pointer;padding: 5px 10px;"
    >
      Expand
    </span>
  {:else}
    <div class="container-grid">
      {#if assetsType === "owned" && $store.userAddress}
        <Box {assetsType} token="tez" {balancesInUsd} />
      {:else if assetsType === "general"}
        <Box {assetsType} token="tez" {balancesInUsd} />
      {/if}
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
{#if assetsType === "owned" && !$store.firstLoading && showStickyHeader}
  <StickyHeader {balancesInUsd} />
{/if}
