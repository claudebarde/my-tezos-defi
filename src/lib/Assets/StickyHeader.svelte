<script lang="ts">
  import { fade } from "svelte/transition";
  import store from "../../store";
  import StickyHeaderBox from "./StickyHeaderBox.svelte";

  export let balancesInUsd;
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .sticky-header {
    position: fixed;
    top: 0;
    margin: 0 auto;
    left: 0;
    right: 0;
    z-index: 90;
    background-color: $container-bg-color;
    padding: 10px 30px;
    width: 80vw;
    border: solid 2px $border-color;
    border-top: none;
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    font-size: 0.7rem;
  }

  @media only screen and (max-width: $mobile-break-point) {
    .sticky-header {
      display: none;
    }
  }
</style>

{#if Object.values($store.tokensBalances).filter(balance => !!balance).length > 0}
  <div class="sticky-header" transition:fade={{ duration: 300 }}>
    {#each Object.entries($store.tokens) as [tokenSymbol, tokenData]}
      {#if $store.tokensBalances[tokenSymbol]}
        <StickyHeaderBox
          {tokenSymbol}
          tokenBalance={$store.tokensBalances[tokenSymbol]}
          balanceInUsd={balancesInUsd[tokenSymbol]}
        />
      {/if}
    {/each}
  </div>
{/if}
