<script lang="ts">
  import SimpleSwaps from "./SimpleSwaps.svelte";
  import ComplexSwaps from "./ComplexSwaps.svelte";
  import store from "../../store";
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
</style>

<div>
  <a href="/#/">
    <span class="material-icons"> arrow_back </span> Back
  </a>
</div>
<h2>Swap tokens</h2>
<br /><br />
{#if $store.userAddress}
  <SimpleSwaps />
  <br /><br />
  <ComplexSwaps />
{/if}
