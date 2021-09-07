<script lang="ts">
  import { onMount } from "svelte";
  import type { ComplexBatchedOp } from "../../../types";
  import {
    getPaulReward,
    getKdaoReward,
    getPlentyReward
  } from "../../../utils";
  import store from "../../../store";

  export let op: ComplexBatchedOp;

  let loading = false;
  let readyToHarvest: null | number = null;

  onMount(async () => {
    console.log(op);
    if (op.type === "harvest") {
      // harvest action
      if (op.platform === "plenty") {
        loading = true;
        // harvest plenty
        try {
          const stakingContract = $store.investments[op.origin];
          const plentyToHarvest = await getPlentyReward(
            $store.userAddress,
            stakingContract.address,
            $store.lastOperations[0].level,
            stakingContract.decimals
          );
          if (plentyToHarvest.status) {
            readyToHarvest = +plentyToHarvest.totalRewards.toFixed(2) / 1;
          } else {
            readyToHarvest = null;
          }
        } catch (error) {
          console.error(error);
        } finally {
          loading = false;
        }
      } else if (op.platform === "paul") {
        // harvest paul
        loading = true;
        try {
          const stakingContract = $store.investments[op.origin];
          const paulToHarvest = await getPaulReward(stakingContract.address);
          if (paulToHarvest) {
            readyToHarvest = +paulToHarvest.toNumber().toFixed(2) / 1;
          } else {
            readyToHarvest = null;
          }
        } catch (error) {
          console.error(error);
        } finally {
          loading = false;
        }
      } else if (op.platform === "kdao") {
        // harvest kdao
        loading = true;
        try {
          const stakingContract = $store.investments[op.origin];
          const kdaoToHarvest = await getKdaoReward(
            stakingContract.address,
            $store.userAddress,
            $store.lastOperations[0].level
          );
          if (kdaoToHarvest) {
            readyToHarvest = +kdaoToHarvest.toNumber().toFixed(2) / 1;
          } else {
            readyToHarvest = null;
          }
        } catch (error) {
          console.error(error);
        } finally {
          loading = false;
        }
      }
    }
  });
</script>

<style lang="scss">
  .action-box__harvest {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  div.loading {
    .material-icons {
      animation: loading-rotate 2s ease-out infinite;
    }
  }
</style>

<div class="action-box__harvest">
  <div>
    <span class="material-icons"> agriculture </span>
  </div>
  <div>
    {op.origin}
  </div>
  {#if loading}
    <div class="loading">
      <span class="material-icons"> sync </span>
    </div>
  {:else}
    <div>
      {readyToHarvest ?? ""}
    </div>
  {/if}
</div>
