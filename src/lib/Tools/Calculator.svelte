<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import CalculatorBox from "./CalculatorBox.svelte";

  let openCalculator = false;
  let xtzVal = 0;
  let conversions = {};

  const update = update => {
    const { val, token } = update.detail;
    // if val is not a number
    if (isNaN(+val)) {
      Object.keys(conversions).forEach(tk => (conversions[tk] = 0));
    }
    // updates XTZ price
    if (token !== "XTZ") {
      xtzVal =
        +($store.tokensExchangeRates[token].realPriceInTez * val).toFixed(5) /
        1;
    } else {
      xtzVal = val;
    }
    // updates tokens prices
    Object.keys(conversions).forEach(tk => {
      if (tk === token) {
        conversions[tk] = val;
      } else {
        conversions[tk] =
          +($store.tokensExchangeRates[tk].realPriceInToken * xtzVal).toFixed(
            5
          ) / 1;
      }
    });
  };

  onMount(() => {
    Object.keys($store.tokens).forEach(token => (conversions[token] = 0));
  });
</script>

<style lang="scss">
  .calculator-container {
    position: fixed;
    top: 10px;
    right: 10px;
    height: 400px;
    width: 350px;
    background-color: white;
    color: black;
    z-index: 999;
    border: solid 2px #d1d5db;
    border-radius: 10px;
    display: grid;
    grid-template-rows: 10% 90%;

    .calculator-header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 5px;

      .material-icons.close {
        color: #ef4444;
        cursor: pointer;
      }
    }

    .calculator-body {
      height: 100%;
      overflow: auto;
    }
  }
</style>

<span
  class="material-icons"
  style="cursor:pointer"
  on:click={() => (openCalculator = true)}
>
  calculate
</span>
{#if openCalculator}
  <div class="calculator-container">
    <div class="calculator-header">
      <span
        class="material-icons close"
        on:click={() => (openCalculator = false)}
      >
        cancel_presentation
      </span>
    </div>
    <div class="calculator-body">
      <CalculatorBox tokenSymbol="XTZ" value={xtzVal} on:update={update} />
      {#each Object.keys($store.tokens) as tokenSymbol}
        <CalculatorBox
          {tokenSymbol}
          value={conversions ? conversions[tokenSymbol] : 0}
          on:update={update}
        />
      {/each}
    </div>
  </div>
{/if}
