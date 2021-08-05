<script lang="ts">
  import { afterUpdate } from "svelte";
  import type { AvailableInvestments } from "../../types";
  import store from "../../store";
  import localStorageStore from "../../localStorage";

  export let availableRewards: {
    id: AvailableInvestments;
    platform: string;
    amount: number;
  }[];

  let totalRewardsInXtz = 0;

  const calculateTotalRewards = () => {
    if (availableRewards.length === 0) {
      totalRewardsInXtz = 0;
    } else if (availableRewards.length === 1) {
      if (availableRewards[0].platform === "plenty") {
        totalRewardsInXtz =
          availableRewards[0].amount *
          $store.tokensExchangeRates.PLENTY.tokenToTez;
      } else if (availableRewards[0].platform === "paul") {
        totalRewardsInXtz =
          availableRewards[0].amount *
          $store.tokensExchangeRates.PAUL.tokenToTez;
      } else if (availableRewards[0].platform === "kdao") {
        totalRewardsInXtz =
          availableRewards[0].amount *
          $store.tokensExchangeRates.kDAO.tokenToTez;
      }
    } else {
      totalRewardsInXtz = availableRewards
        .map(rw => {
          const amount = rw.amount ? rw.amount : 0;
          if (rw.platform === "plenty") {
            return amount * $store.tokensExchangeRates.PLENTY.tokenToTez;
          } else if (rw.platform === "paul") {
            return amount * $store.tokensExchangeRates.PAUL.tokenToTez;
          } else if (rw.platform === "kdao") {
            return amount * $store.tokensExchangeRates.kDAO.tokenToTez;
          }
        })
        .reduce((a, b) => a + b);
    }
  };

  afterUpdate(() => {
    if ($store.investments) {
      calculateTotalRewards();
    }
  });

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      calculateTotalRewards();
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .row.info {
    border-top: solid 4px $border-color;
    margin: 5px 0px;
    padding: 10px;
    text-align: right;
    font-size: 0.9rem;
  }
</style>

{#if availableRewards && availableRewards.length > 0}
  <div class="row info">
    {availableRewards.length} reward{availableRewards.length > 1 ? "s" : ""} ready
    to harvest: {+totalRewardsInXtz.toFixed(2) / 1} ꜩ / {+(
      totalRewardsInXtz * $store.xtzData.exchangeRate
    ).toFixed(2) / 1}
    {$localStorageStore.preferredFiat}
  </div>
{/if}
