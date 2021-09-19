<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { OpKind } from "@taquito/taquito";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  //import toastStore from "../Toast/toastStore";

  export let lbContractAddress, tokenPool, xtzPool, lqtTotal, refreshData;

  let amountInXTZ = "";
  let amountInTzbtc = "";
  let userXtzBalance = 0;
  let userTzbtcBalance = 0;
  let tzBtcRate = 0;
  let slippage = 0.5;
  let minLqtMinted = 0;
  let addLiquidityLoading = false;
  let addLiquiditySuccessfull: false | 1 | 2 = false; // false = no data | 1 = successfull | 2 = failed

  const calcMinLqtMinted = () =>
    Math.floor((+amountInXTZ * 10 ** 6 * lqtTotal) / xtzPool);

  const addLiquidity = async () => {
    if (isNaN(+amountInXTZ)) {
      const text = "XTZ amount must be a number";
      //toastStore.addToast({ type: "error", text, dismissable: true });
      throw text;
    }
    if (isNaN(+amountInTzbtc)) {
      const text = "tzBTC amount must be a number";
      //toastStore.addToast({ type: "error", text, dismissable: true });
      throw text;
    }

    addLiquidityLoading = true;
    addLiquiditySuccessfull = false;

    try {
      const lbContract = await $store.Tezos.wallet.at(lbContractAddress);
      const tzBtcContract = await $store.Tezos.wallet.at(
        $store.tokens.tzBTC.address
      );
      const formattedTzbtc = Math.floor(
        +amountInTzbtc * 10 ** $store.tokens.tzBTC.decimals
      );
      const maxTokensSold = Math.floor(
        +formattedTzbtc + (+formattedTzbtc * slippage) / 100
      );
      const deadline = new Date(Date.now() + 60000).toISOString();
      const batchOp = await $store.Tezos.wallet
        .batch([
          {
            kind: OpKind.TRANSACTION,
            ...tzBtcContract.methods
              .approve(lbContractAddress, 0)
              .toTransferParams()
          },
          {
            kind: OpKind.TRANSACTION,
            ...tzBtcContract.methods
              .approve(lbContractAddress, maxTokensSold)
              .toTransferParams()
          },
          {
            kind: OpKind.TRANSACTION,
            ...lbContract.methods
              .addLiquidity(
                $store.userAddress,
                minLqtMinted - 3,
                maxTokensSold,
                deadline
              )
              .toTransferParams(),
            amount: +amountInXTZ * 10 ** 6,
            mutez: true
          },
          {
            kind: OpKind.TRANSACTION,
            ...tzBtcContract.methods
              .approve(lbContractAddress, 0)
              .toTransferParams()
          }
        ])
        .send();
      await batchOp.confirmation();

      addLiquidityLoading = false;
      addLiquiditySuccessfull = 1;
      amountInXTZ = "";
      amountInTzbtc = "";
      minLqtMinted = 0;
      setTimeout(() => (addLiquiditySuccessfull = false), 2000);
      refreshData();
    } catch (error) {
      console.log(error);
      addLiquidityLoading = false;
      addLiquiditySuccessfull = 2;
      setTimeout(() => (addLiquiditySuccessfull = false), 2000);
    } finally {
      addLiquidityLoading = false;
    }
  };

  const updateTokenAmounts = e => {
    const val = e.target.value;
    if (isNaN(+val) || val.trim().length === 0) {
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

    minLqtMinted = calcMinLqtMinted();
  };

  onMount(() => {
    amountInXTZ = "";
    amountInTzbtc = "";
    tzBtcRate = 0;
    slippage = 0.5;
  });

  afterUpdate(() => {
    tzBtcRate = xtzPool / 10 ** 6 / (tokenPool / 10 ** 8);
    userXtzBalance = $store.xtzData.balance / 10 ** 6;
    userTzbtcBalance =
      $store.tokensBalances && $store.tokensBalances.tzBTC
        ? +$store.tokensBalances.tzBTC
        : 0;
  });
</script>

<style lang="scss">
  .material-icons {
    vertical-align: bottom;
  }

  .trade-inputs {
    width: 60%;
    display: grid;
    grid-template-columns: 10% 35% 10% 35% 10%;
    justify-items: center;

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
  <img src={$store.tokens.tzBTC.thumbnail} alt="tzBTC-logo" />
  <div>
    <input
      type="text"
      value={amountInTzbtc}
      id="input-tzbtc-amount"
      autocomplete="off"
      on:input={updateTokenAmounts}
      class:error={+amountInTzbtc > +userTzbtcBalance}
    />
    <div
      class="trade-input-balance"
      style="cursor:pointer"
      on:click={() => {
        amountInTzbtc = userTzbtcBalance.toString();
        amountInXTZ = (
          Math.floor(+amountInTzbtc * +tzBtcRate * 10 ** 6) /
          10 ** 6
        ).toString();
        minLqtMinted = calcMinLqtMinted();
      }}
    >
      Your balance: {+userTzbtcBalance.toFixed(5) / 1}
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
      class:error={+amountInXTZ > +userXtzBalance}
    />
    <div
      class="trade-input-balance"
      style="cursor:pointer"
      on:click={() => {
        amountInXTZ = userXtzBalance.toString();
        amountInTzbtc = (+amountInXTZ / +tzBtcRate).toString();
        minLqtMinted = calcMinLqtMinted();
      }}
    >
      Your balance: {+userXtzBalance.toFixed(5) / 1}
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
