<script lang="ts">
  import LastOpsTargets from "./LastOpsTargets.svelte";
  import TransfersValues from "./TransfersValues.svelte";
  import LqtValue from "./LqtValue.svelte";
  import store from "../../store";
</script>

<style lang="scss">
  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    .charts-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      padding: 10px 0px;
    }
  }
</style>

<section>
  <div class="charts-container">
    {#if $store.lastOperations.length > 0}
      <LastOpsTargets />
      <br />
      <TransfersValues />
      <br />
      <LqtValue />
    {:else}
      Waiting for data to display...
    {/if}
  </div>
</section>
