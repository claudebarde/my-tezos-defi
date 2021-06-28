<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import CalculatorBox from "./CalculatorBox.svelte";

  let openCalculator = false;
  let leftPos = 10;
  let topPos = 100;
  let dragging = false;
  let xtzVal = 0;
  let fiatVal = 0;
  let conversions = {};

  const startDragging = e => {
    if (e.which === 1) {
      // left click
      dragging = true;
    }
  };
  const stopDragging = () => {
    dragging = false;
  };
  const drag = e => {
    if (dragging) {
      leftPos += e.movementX;
      topPos += e.movementY;
    }
  };

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
    // updates fiat price
    fiatVal = +(xtzVal * $store.xtzData.exchangeRate).toFixed(5) / 1;
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
  @import "../../styles/settings.scss";

  .calculator-container {
    position: fixed;
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
      justify-content: space-between;
      align-items: center;
      padding: 5px;
      background: #8e9eab; /* fallback for old browsers */
      background: -webkit-linear-gradient(
        to bottom,
        #eef2f3,
        #8e9eab
      ); /* Chrome 10-25, Safari 5.1-6 */
      background: linear-gradient(
        to bottom,
        #eef2f3,
        #8e9eab
      ); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      cursor: move;

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

  @media only screen and (max-width: $mobile-break-point) {
    .calculator-container {
      height: calc(100% - 20px);
      width: 350px;
    }
  }
</style>

<svelte:window on:mouseup={stopDragging} on:mousemove={drag} />

<span
  class="material-icons"
  style="cursor:pointer"
  on:click={() => (openCalculator = true)}
>
  calculate
</span>
{#if openCalculator}
  <div
    class="calculator-container"
    style={`left: ${leftPos}px; top: ${topPos}px`}
  >
    <div class="calculator-header" on:mousedown={startDragging}>
      <span>Token Convertor</span>
      <span
        class="material-icons close"
        on:click={() => (openCalculator = false)}
      >
        cancel_presentation
      </span>
    </div>
    <div class="calculator-body">
      <CalculatorBox tokenSymbol="FIAT" value={fiatVal} on:update={update} />
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
