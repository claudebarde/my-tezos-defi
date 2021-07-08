<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import CalculatorBox from "./CalculatorBox.svelte";

  let openCalculator = false;
  let leftPos = 10;
  let topPos = 10;
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
    if (!val || isNaN(+val)) {
      Object.keys(conversions).forEach(tk => (conversions[tk] = 0));
      xtzVal = 0;
      fiatVal = 0;
      return;
    }
    // updates XTZ price
    if (token !== "XTZ" && token !== "FIAT") {
      xtzVal =
        +($store.tokensExchangeRates[token].realPriceInTez * val).toFixed(5) /
        1;
      // updates fiat price
      fiatVal = +(xtzVal * $store.xtzData.exchangeRate).toFixed(5) / 1;
    } else if (token === "XTZ") {
      xtzVal = val;
      // updates fiat price
      fiatVal = +(xtzVal * $store.xtzData.exchangeRate).toFixed(5) / 1;
    } else if (token === "FIAT") {
      fiatVal = val;
      xtzVal = +($store.xtzData.exchangeRate / 10 / fiatVal).toFixed(5) / 1;
    }
    // updates tokens prices
    Object.keys(conversions).forEach(tk => {
      console.log(tk, $store.tokensExchangeRates[tk]);
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

  const handleDoubleClick = e => {
    if (openCalculator) {
      const value = e.target.textContent;
      const target = e.target.getAttribute("data-target");
      // checks if target is a token
      let [token, _] = Object.entries($store.tokens).find(
        tk => tk[1].address[$store.network] === target
      ) || [undefined, undefined];
      if (!token) {
        // checks if target is an investment
        let inv = Object.values($store.investments).find(
          tk => tk.address[$store.network] === target
        );
        if (inv && inv.token) {
          token = inv.token;
        } else {
          return;
        }
      }
      if (!isNaN(+value) && +value > 0 && token) {
        update({ detail: { val: +value, token: token } });
      }
    }
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
      top: 10px;
      left: 10px;
    }
  }
</style>

<svelte:window
  on:mouseup={stopDragging}
  on:mousemove={drag}
  on:dblclick={handleDoubleClick}
/>

{#if !Object.values($store.tokensExchangeRates).some(val => val === undefined)}
  <span
    class="material-icons"
    style="cursor:pointer"
    on:click={() => {
      openCalculator = true;
      xtzVal = 0;
      fiatVal = 0;
    }}
  >
    calculate
  </span>
{/if}
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
