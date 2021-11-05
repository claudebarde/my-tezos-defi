<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import CalculatorBox from "./CalculatorBox.svelte";

  let openCalculator = false;
  let xtzVal = 0;
  let fiatVal = 0;
  let conversions = {};

  const update = update => {
    const { val, token } = update.detail;
    // if val is not a number
    if (!val || isNaN(+val)) {
      Object.keys(conversions).forEach(tk => (conversions[tk] = 0));
      xtzVal = 0;
      fiatVal = 0;
      return;
    }
    // updates XTZ price
    if (token !== "XTZ" && token !== "FIAT") {
      xtzVal = +($store.tokens[token].exchangeRate * val).toFixed(5) / 1;
      // updates fiat price
      fiatVal = +(xtzVal * $store.xtzData.exchangeRate).toFixed(5) / 1;
    } else if (token === "XTZ") {
      xtzVal = val;
      // updates fiat price
      //fiatVal = +(1 / (xtzVal * $store.xtzData.exchangeRate)).toFixed(5);
      fiatVal = +(xtzVal * $store.xtzData.exchangeRate).toFixed(5);
    } else if (token === "FIAT") {
      fiatVal = val;
      xtzVal = +(fiatVal / $store.xtzData.exchangeRate).toFixed(5) / 1;
    }
    // updates tokens prices
    Object.keys(conversions).forEach(tk => {
      if (tk === token) {
        conversions[tk] = val;
      } else {
        conversions[tk] =
          +(xtzVal / $store.tokens[tk].exchangeRate).toFixed(5) / 1;
      }
    });
  };

  onMount(() => {
    if ($store.tokens) {
      Object.keys($store.tokens).forEach(token => (conversions[token] = 0));
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .calculator-container {
    $height: 400px;

    position: absolute;
    top: 60px;
    right: 0px;
    height: $height;
    width: 350px;
    box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
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
      top: 10px;
      left: 10px;
    }
  }
</style>

<div style="position:relative">
  {#if $store.tokens}
    <button
      class="primary"
      on:click={() => {
        openCalculator = true;
        xtzVal = 0;
        fiatVal = 0;
      }}
    >
      <span class="material-icons"> calculate </span>
    </button>
  {/if}
  {#if $store.tokens && openCalculator}
    <div class="calculator-container">
      <div class="calculator-header">
        <span>Token Convertor</span>
        <span
          class="material-icons close"
          on:click={() => (openCalculator = false)}
        >
          cancel_presentation
        </span>
      </div>
      <div class="calculator-body">
        <CalculatorBox
          tokenSymbol={$localStorageStore.preferredFiat}
          value={fiatVal}
          on:update={update}
        />
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
</div>
