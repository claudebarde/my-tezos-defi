<script lang="ts">
  import SelectBox from "../Tools/SelectBox.svelte";
  import store from "../../store";

  let tokenFrom = "";
  let tokenTo = "";
</script>

<style lang="scss">
  .material-icons {
    vertical-align: bottom;
  }

  a {
    text-decoration: none;
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  h2 {
    text-align: center;
  }

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

<div>
  <a href="/#/">
    <span class="material-icons"> arrow_back </span> Back
  </a>
</div>
<h2>Swap tokens</h2>
<br /><br />
<div class="container">
  <div class="title">Swaps</div>
  <div class="container-swaps">
    <div>
      <SelectBox
        options={Object.keys($store.tokens)}
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
        options={Object.keys($store.tokens)}
        on:new-selection={e => (tokenTo = e.detail)}
      />
    </div>
  </div>
</div>
