<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import toastStore from "../Toast/toastStore";

  export let lbContractAddress, tokenPool, xtzPool, lqtTotal;

  let amountInXTZ = "";
  let amountInTzbtc = "";
  let tzBtcRate = 0;
  let slippage = 0.5;
  let minLqtMinted = 0;
  let addLiquidityLoading = false;
  let addLiquiditySuccessfull: false | 1 | 2 = false; // false = no data | 1 = successfull | 2 = failed

  const addLiquidity = async () => {
    console.log("addLiquidity");
  };

  const updateTokenAmounts = e => {
    const val = e.target.value;
    if (isNaN(+val)) {
      e.target.value = "";
      amountInTzbtc = "";
      amountInXTZ = "";
      return;
    }

    if (e.target.id === "input-tzbtc-amount") {
      amountInTzbtc = val;
      amountInXTZ = (
        Math.floor(+amountInTzbtc * +tzBtcRate * 10 ** 6) /
        10 ** 6
      ).toString();
    } else {
      amountInXTZ = val;
      amountInTzbtc = (+amountInXTZ / +tzBtcRate).toString();
    }

    minLqtMinted = (+amountInXTZ * 10 ** 6 * lqtTotal) / xtzPool;
  };

  onMount(() => {
    amountInXTZ = "";
    amountInTzbtc = "";
    tzBtcRate = 0;
    slippage = 0.5;
  });

  afterUpdate(() => {
    tzBtcRate = xtzPool / 10 ** 6 / (tokenPool / 10 ** 8);
  });
</script>

<style lang="scss">
  .material-icons {
    vertical-align: bottom;
  }

  .trade-inputs {
    display: flex;
    justify-content: center;

    img {
      width: 30px;
      height: 30px;
    }

    .trade-input-balance {
      padding: 0px 15px;
      font-size: 0.7rem;
    }
  }

  .trade-slippage {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.9rem;
  }
</style>

<div style="font-size:0.9rem">
  1 tzBTC = {tzBtcRate.toFixed(5)} XTZ ({(
    tzBtcRate * $store.xtzData.exchangeRate
  ).toFixed(2)}
  {$localStorageStore.preferredFiat})
</div>
<div style="font-size:0.9rem">
  Minted LQ token: {+minLqtMinted.toFixed(5) / 1}
</div>
<br />
<div class="trade-inputs">
  <img src="images/tzBTC.png" alt="tzBTC-logo" />
  <div>
    <input
      type="text"
      value={amountInTzbtc}
      id="input-tzbtc-amount"
      autocomplete="off"
      on:input={updateTokenAmounts}
    />
    <div class="trade-input-balance">
      Your balance: {$store.tokensBalances && $store.tokensBalances.tzBTC
        ? +$store.tokensBalances.tzBTC.toFixed(5) / 1
        : "--"}
    </div>
  </div>
  <span class="material-icons"> sync_alt </span>
  <div>
    <input
      type="text"
      id="input-xtz-amount"
      autocomplete="off"
      value={amountInXTZ}
      on:input={updateTokenAmounts}
    />
    <div class="trade-input-balance">
      Your balance: {+($store.xtzData.balance / 10 ** 6).toFixed(5) / 1}
    </div>
  </div>
  <img src="images/XTZ.png" alt="XTZ-logo" />
</div>
<br />
<div class="trade-slippage">
  <div>Slippage:</div>
  <div>
    <label for="slippage-05">
      <input
        type="radio"
        name="slippage-selection"
        id="slippage-05"
        bind:group={slippage}
        value={0.5}
      />
      0.5%
    </label>
    <label for="slippage-1">
      <input
        type="radio"
        name="slippage-selection"
        id="slippage-1"
        bind:group={slippage}
        value={1}
      />
      1%
    </label>
    <label for="slippage-2">
      <input
        type="radio"
        name="slippage-selection"
        id="slippage-2"
        bind:group={slippage}
        value={2}
      />
      2%
    </label>
  </div>
</div>
<br />
<div>
  {#if addLiquidityLoading}
    <button class="button main loading" disabled>
      Add liquidity
      <span class="material-icons"> sync </span>
    </button>
  {:else if addLiquiditySuccessfull === 1}
    <button class="button main success" disabled>
      Add liquidity
      <span class="material-icons"> thumb_up </span>
    </button>
  {:else if addLiquiditySuccessfull === 2}
    <button class="button main error" disabled>
      Add liquidity
      <span class="material-icons"> report_problem </span>
    </button>
  {:else}
    <button
      class="button main"
      style={`visibility:${
        +amountInTzbtc > 0 && +amountInXTZ > 0 ? "visible" : "hidden"
      }`}
      on:click={addLiquidity}
    >
      Add liquidity
    </button>
  {/if}
</div>
