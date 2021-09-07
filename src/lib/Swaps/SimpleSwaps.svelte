<script lang="ts">
  import SelectBox from "../Tools/SelectBox.svelte";
  import store from "../../store";

  let tokenFrom = "";
  let tokenTo = "";
</script>

<style lang="scss">
  .container-swaps {
    padding: 10px 0px;
    display: grid;
    grid-template-columns: 30% 40% 30%;
    text-align: center;

    div {
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
  }
</style>

<div class="container">
  <div class="title">Simple swaps</div>
  <div class="container-swaps">
    <div>
      <SelectBox
        options={Object.keys($store.tokens).map(tk => ({
          icons: [tk],
          name: tk
        }))}
        on:new-selection={e => (tokenFrom = e.detail)}
      />
    </div>
    <div>
      {#if tokenFrom && tokenTo}
        {tokenFrom} <span class="material-icons"> arrow_forward </span>
        {tokenTo}
      {:else}
        Choose a token pair
      {/if}
    </div>
    <div>
      <SelectBox
        options={Object.keys($store.tokens).map(tk => ({
          icons: [tk],
          name: tk
        }))}
        on:new-selection={e => (tokenTo = e.detail)}
      />
    </div>
  </div>
</div>
