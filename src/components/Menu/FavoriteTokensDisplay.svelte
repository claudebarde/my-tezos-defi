<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { formatTokenAmount } from "../../utils";

  let favoriteTokens = [];
  let counter = 0;
  let counterInterval;

  onMount(() => {
    counterInterval = setInterval(() => {
      if (counter === favoriteTokens.length - 1) {
        counter = 0;
      } else {
        counter += 1;
      }
    }, 5_000);
  });

  afterUpdate(() => {
    if ($localStorageStore && favoriteTokens.length === 0) {
      // initializes the tokens array
      favoriteTokens = [...$localStorageStore.favoriteTokens];
    } else if (
      favoriteTokens.length > 0 &&
      $localStorageStore &&
      $localStorageStore.favoriteTokens.length !== favoriteTokens.length
    ) {
      // tokens were removed or added
    }
  });

  onDestroy(() => {
    clearInterval(counterInterval);
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .token-display {
    border: solid 1px $bg-color;
    border-radius: 10px;
    padding: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    width: 70%;

    img {
      height: 1.5rem;
    }
  }
</style>

{#if $localStorageStore && $store.tokens && favoriteTokens.length > 0}
  <div class="token-display">
    <img
      src={$store.tokens[favoriteTokens[counter]].thumbnail}
      alt={`${favoriteTokens[counter]}-logo`}
    />
    <span>{favoriteTokens[counter]}</span>
    <span>
      <span>
        {$store.tokensBalances && $store.tokensBalances[favoriteTokens[counter]]
          ? formatTokenAmount($store.tokensBalances[favoriteTokens[counter]])
          : 0}
      </span>
      <br />
      <span>
        ꜩ {+$store.tokens[favoriteTokens[counter]].exchangeRate.toFixed(3) / 1}
      </span>
      <br />
      {#if $store.xtzData.exchangeRate}
        {(
          $store.tokens[favoriteTokens[counter]].exchangeRate *
          $store.xtzData.exchangeRate
        ).toFixed(2)}
        {$localStorageStore.preferredFiat}
      {:else}
        ---
      {/if}
    </span>
  </div>
{/if}
