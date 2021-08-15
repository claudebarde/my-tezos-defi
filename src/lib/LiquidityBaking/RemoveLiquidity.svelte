<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { OpKind } from "@taquito/taquito";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import toastStore from "../Toast/toastStore";
  import { calculateLqtOutput } from "../../utils";

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

  const removeLiquidity = async () => {
    if (isNaN(+amountInLqt)) {
      const text = "LQT amount must be a number";
      toastStore.addToast({ type: "error", text, dismissable: true });
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

  const updateTokenAmounts = e => {
    const val = e.target.value;
    if (isNaN(+val)) {
      e.target.value = "";
      amountInLqt = "";
      return;
    }

    amountInLqt = Math.floor(val).toString();
    // calculates amounts in XTZ and tzBTC for LB tokens
    const result = calculateLqtOutput({
      lqTokens: +amountInLqt,
      xtzPool,
      lqtTotal,
      tezToTzbtc: $store.tokensExchangeRates.tzBTC.tezToToken
    });
    xtzOut = result.xtz;
    tzBtcOut = result.tzbtc;
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
      border: solid 2px white;
      border-radius: 50%;
      line-height: 28px;
      text-align: center;
    }

    .remove-input-balance {
      padding: 0px 15px;
      font-size: 0.7rem;
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
      on:input={updateTokenAmounts}
    />
    <div
      class="remove-input-balance"
      on:click={() => (amountInLqt = userLqtBalance)}
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
<div>
  {#if removeLiquidityLoading}
    <button class="button main loading" disabled>
      Remove liquidity
      <span class="material-icons"> sync </span>
    </button>
  {:else if removeLiquiditySuccessfull === 1}
    <button class="button main success" disabled>
      Remove liquidity
      <span class="material-icons"> thumb_up </span>
    </button>
  {:else if removeLiquiditySuccessfull === 2}
    <button class="button main error" disabled>
      Remove liquidity
      <span class="material-icons"> report_problem </span>
    </button>
  {:else}
    <button
      class="button main"
      style={`visibility:${+amountInLqt > 0 ? "visible" : "hidden"}`}
      on:click={removeLiquidity}
    >
      Remove liquidity
    </button>
  {/if}
</div>
