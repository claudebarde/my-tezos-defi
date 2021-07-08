<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import Box from "./Box.svelte";
  import StickyHeader from "./StickyHeader.svelte";

  export let balancesInUsd: any, assetsType: "owned" | "general";

  let expandGeneralAssets = true;
  let loading = true;
  let loadingAllExchangeRates = true;
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

    if (
      Object.values($store.tokensExchangeRates).every(el => el !== undefined)
    ) {
      // if some exchange rates are not set,
      // it's probably because the ones that are set were pulled from the local storage
      loadingAllExchangeRates = false;
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

  .ticker-container {
    width: 100%;
    overflow: hidden;

    .ticker-wrap {
      width: 100%;
      padding: 15px;
      padding-left: 100%;
      background-color: transparent;
    }

    .ticker-move {
      display: inline-block;
      white-space: nowrap;
      padding-right: 100%;
      animation: ticker 30s linear infinite;

      &:hover {
        animation-play-state: paused;
      }

      .ticker-item {
        display: inline-block;
        padding: 0 40px;
        font-size: 1rem;

        img {
          width: 25px;
          height: 25px;
          vertical-align: middle;
        }
      }
    }
  }

  @keyframes ticker {
    100% {
      transform: translate3d(-100%, 0, 0);
    }
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
    <div class="ticker-container">
      <div class="ticker-wrap">
        <div class="ticker-move">
          {#if Object.values($store.tokensExchangeRates).some(val => !val)}
            <div class="ticker-item">
              Loading exchange rates, please wait...
            </div>
          {:else}
            {#each Object.entries($store.tokensExchangeRates).filter(entry => $store.tokensBalances[entry[0]] === undefined) as entry (entry[0])}
              {#if entry[1]}
                <div class="ticker-item">
                  <img src={`images/${entry[0]}.png`} alt="token" />&nbsp;&nbsp;
                  {entry[0]}: {entry[1].tokenToTez} ꜩ
                </div>
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="container-grid">
      {#if assetsType === "owned" && $store.userAddress}
        <Box
          {assetsType}
          token="tez"
          {balancesInUsd}
          {loadingAllExchangeRates}
        />
      {/if}
      {#each Object.entries($store.tokens) as token}
        {#if assetsType === "owned" && $store.tokensBalances[token[0]]}
          <Box {assetsType} {token} {balancesInUsd} {loadingAllExchangeRates} />
        {:else if assetsType === "general" && !$store.tokensBalances[token[0]]}
          <Box {assetsType} {token} {balancesInUsd} {loadingAllExchangeRates} />
        {/if}
      {/each}
    </div>
  {/if}
</div>
{#if assetsType === "owned" && !$store.firstLoading && showStickyHeader}
  <StickyHeader {balancesInUsd} />
{/if}
