<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  //import toastStore from "../Toast/toastStore";
  import { calculateLqtOutput, formatTokenAmount } from "../../utils";
  import config from "../../config";

  export let lbContractAddress,
    tokenPool,
    xtzPool,
    lqtTotal,
    userLqtBalance,
    refreshData;

  let amountInLqt = "";
  let tzBtcRate = 0;
  let slippage = 0.5;
  let xtzOut = 0;
  let tzBtcOut = 0;
  let removeLiquidityLoading = false;
  let removeLiquiditySuccessfull: false | 1 | 2 = false; // false = no data | 1 = successfull | 2 = failed
  let mtdFee: null | number = null;

  const removeLiquidity = async () => {
    if (isNaN(+amountInLqt)) {
      const text = "LQT amount must be a number";
      //toastStore.addToast({ type: "error", text, dismissable: true });
      throw text;
    }

    removeLiquidityLoading = true;
    removeLiquiditySuccessfull = false;

    try {
      const lbContract = await $store.Tezos.wallet.at(lbContractAddress);
      const deadline = new Date(Date.now() + 60000).toISOString();
      const op = await lbContract.methods
        .removeLiquidity(
          $store.userAddress,
          amountInLqt,
          Math.floor(xtzOut * 10 ** 6),
          Math.floor(tzBtcOut * 10 ** $store.tokens.tzBTC.decimals),
          deadline
        )
        .send();
      await op.confirmation();

      removeLiquidityLoading = false;
      removeLiquiditySuccessfull = 1;
      amountInLqt = "";
      xtzOut = 0;
      tzBtcOut = 0;
      setTimeout(() => (removeLiquiditySuccessfull = false), 2000);
      refreshData();
    } catch (error) {
      console.log(error);
      removeLiquidityLoading = false;
      removeLiquiditySuccessfull = 2;
      setTimeout(() => (removeLiquiditySuccessfull = false), 2000);
    } finally {
      removeLiquidityLoading = false;
    }
  };

  const updateTokenAmounts = val => {
    if (isNaN(+val)) {
      amountInLqt = "";
      mtdFee = null;
      return;
    }

    amountInLqt = Math.floor(val).toString();
    // calculates amounts in XTZ and tzBTC for LB tokens
    const result = calculateLqtOutput({
      lqTokens: +amountInLqt,
      xtzPool,
      lqtTotal,
      tezToTzbtc: $store.tokens.tzBTC.exchangeRate
    });
    xtzOut = result.xtz;
    tzBtcOut = result.tzbtc;
    mtdFee = result.xtz * 2 * config.mtdFee;
  };

  onMount(() => {
    amountInLqt = "";
    slippage = 0.5;
  });

  afterUpdate(() => {
    tzBtcRate = xtzPool / 10 ** 6 / (tokenPool / 10 ** 8);
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .material-icons {
    vertical-align: bottom;
  }

  .remove-inputs {
    display: flex;
    justify-content: center;

    .lbt-symbol {
      display: inline-block;
      width: 28px;
      height: 28px;
      vertical-align: bottom;
      border: solid 2px $container-bg-color;
      border-radius: 50%;
      line-height: 28px;
      text-align: center;
      margin-right: 10px;
    }

    .remove-input-balance {
      padding: 0px 15px;
      font-size: 0.7rem;
    }

    input[type="text"] {
      border: solid 1px $container-bg-color;
      border-radius: 10px;
      padding: 5px;
      font-size: 1rem;
      outline: none;
    }
  }

  .remove-slippage {
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
  Get &thickapprox; {+xtzOut.toFixed(3) / 1} XTZ / {+tzBtcOut.toFixed(8) / 1} tzBTC
</div>
<br />
<div class="remove-inputs">
  <div class="lbt-symbol">LB</div>
  <div>
    <input
      type="text"
      value={amountInLqt}
      id="input-tzbtc-amount"
      autocomplete="off"
      on:input={e => updateTokenAmounts(e.target.value)}
    />
    <div
      class="remove-input-balance"
      on:click={() => {
        amountInLqt = userLqtBalance;
        updateTokenAmounts(userLqtBalance);
      }}
      style="cursor:pointer"
    >
      Your balance: {userLqtBalance.toLocaleString("en-US")}
    </div>
  </div>
</div>
<br />
<div class="remove-slippage">
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
<div style="font-size:0.7rem">
  {#if mtdFee}
    MTD fee: {formatTokenAmount(mtdFee)} XTZ
  {/if}
</div>
<br />
<div>
  {#if removeLiquidityLoading}
    <button class="primary loading" disabled>
      Remove liquidity
      <span class="material-icons"> sync </span>
    </button>
  {:else if removeLiquiditySuccessfull === 1}
    <button class="primary success" disabled>
      Remove liquidity
      <span class="material-icons"> thumb_up </span>
    </button>
  {:else if removeLiquiditySuccessfull === 2}
    <button class="primary error" disabled>
      Remove liquidity
      <span class="material-icons"> report_problem </span>
    </button>
  {:else}
    <button
      class="primary"
      style={`visibility:${+amountInLqt > 0 ? "visible" : "hidden"}`}
      on:click={removeLiquidity}
    >
      Remove liquidity
    </button>
  {/if}
</div>
