<script lang="ts">
  import LastOpsTargets from "./LastOpsTargets.svelte";
  import TransfersValues from "./TransfersValues.svelte";
  import store from "../../store";
</script>

<style lang="scss">
  .container-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 10px 0px;
  }
</style>

<div class="container">
  <div class="title">Charts</div>
  <div class="container-body">
    {#if $store.lastOperations.length > 0}
      <LastOpsTargets />
      <TransfersValues />
    {:else}
      Waiting for data to display...
    {/if}
  </div>
</div>
