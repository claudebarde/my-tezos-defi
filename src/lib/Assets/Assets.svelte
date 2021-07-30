<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import Box from "./Box.svelte";
  import StickyHeader from "./StickyHeader.svelte";
  import { sortTokensByBalance } from "../../utils";

  export let assetsType: "general" | "favorite" | "others";

  let expandGeneralAssets = false;
  let loading = true;
  let ticking = false;
  let showStickyHeader = false;

  const updateStickyHeaderDisplay = lastKnownScrollPosition => {
    const container = document.getElementById("container-favorite-tokens");
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
    if (assetsType === "favorite") {
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
    if (
      loading &&
      $store.tokensBalances &&
      Object.values($store.tokensBalances).some(el => el)
    ) {
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
      animation: ticker 40s linear infinite;

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

<div class="container" id={`container-${assetsType}-tokens`}>
  <div class="title">
    {#if assetsType === "general"}
      Assets
    {:else if assetsType === "favorite"}
      Favorite assets
    {:else if assetsType === "others"}
      Other assets
    {/if}
  </div>
  {#if assetsType === "others"}
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
  {#if assetsType === "others"}
    {#if !expandGeneralAssets}
      <div class="ticker-container">
        <div class="ticker-wrap">
          <div class="ticker-move">
            {#if !$store.tokensExchangeRates || ($store.tokensExchangeRates && Object.values($store.tokensExchangeRates).some(val => !val))}
              <div class="ticker-item">
                Loading exchange rates, please wait...
              </div>
            {:else}
              {#each Object.entries($store.tokensExchangeRates)
                .filter( token => (!$localStorageStore ? true : !$localStorageStore.favoriteTokens.includes(token[0])) )
                .sort((a, b) => a[0]
                    .toLowerCase()
                    .localeCompare(b[0].toLowerCase())) as entry (entry[0])}
                {#if entry[1]}
                  <div class="ticker-item">
                    <img
                      src={`images/${entry[0]}.png`}
                      alt="token"
                    />&nbsp;&nbsp;
                    {entry[0]}: {entry[1].tokenToTez} ꜩ
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        </div>
      </div>
    {:else if expandGeneralAssets}
      <div class="container-grid">
        {#if $store.tokensExchangeRates && $store.tokensBalances}
          {#each Object.entries($store.tokens).filter(token => !token[1].favorite) as token}
            <Box {assetsType} {token} />
          {/each}
        {:else}
          <div>Loading...</div>
        {/if}
      </div>
    {/if}
  {:else if assetsType === "favorite"}
    <div class="container-grid">
      <Box {assetsType} token="tez" />
      {#if $store.tokens && $store.tokensExchangeRates && $store.tokensBalances && $localStorageStore && $localStorageStore.favoriteTokens}
        {#each sortTokensByBalance($localStorageStore.favoriteTokens.map( tk => [tk, $store.tokensBalances[tk]] )).map( tk => [tk[0], $store.tokens[tk[0]]] ) as token (token[0])}
          <Box {assetsType} {token} />
        {/each}
      {/if}
    </div>
  {:else if assetsType === "general"}
    <div class="container-grid">
      <Box {assetsType} token="tez" />
    </div>
  {/if}
</div>
{#if assetsType === "favorite" && showStickyHeader}
  <StickyHeader />
{/if}
