<script lang="ts">
  import { afterUpdate } from "svelte";
  import historicDataStore from "../../historicDataStore";
  import { calculateTrend } from "../../utils";
  import type { AvailableToken } from "../../types";

  export let tokenSymbol, tokenBalance, balanceInUsd;

  let nrOfTrends = 0;
  let trend: "up" | "down" | "same" | undefined = undefined;

  afterUpdate(() => {
    if (
      $historicDataStore.tokens[tokenSymbol].length > 2 &&
      $historicDataStore.tokens[tokenSymbol].length !== nrOfTrends
    ) {
      const newTrend = calculateTrend(
        $historicDataStore,
        tokenSymbol as AvailableToken
      );
      trend = newTrend.trend;
      nrOfTrends = newTrend.nrOfTrends;
    }
  });
</script>

<style lang="scss">
  .sticky-header-box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    img {
      width: 20px;
      height: 20px;
    }

    .material-icons.up {
      color: #10b981;
    }
    .material-icons.down {
      color: #ef4444;
    }
    .material-icons.same {
      color: #6b7280;
    }
  }
</style>

<div class="sticky-header-box">
  <div>
    <img src={`images/${tokenSymbol}.png`} alt="token-symbol" />
    {#if trend === "same"}
      <span class="material-icons same"> trending_flat </span>
    {:else if trend === "up"}
      <span class="material-icons up"> trending_up </span>
    {:else}
      <span class="material-icons down"> trending_down </span>
    {/if}
  </div>
  <div>
    {#if +tokenBalance.toFixed(2) / 1 === 0}
      &gt; 0.01
    {:else}
      {+tokenBalance.toFixed(2) / 1}
    {/if}
    {tokenSymbol}
  </div>
  <div>
    {#if !balanceInUsd}
      N/A
    {:else}
      {balanceInUsd.toFixed(2) / 1} USD
    {/if}
  </div>
</div>
