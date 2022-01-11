<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { OpKind } from "@taquito/taquito";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import config from "../../config";
  import { formatTokenAmount } from "../../utils";
  //import toastStore from "../Toast/toastStore";

  export let lbContractAddress, tokenPool, xtzPool;

  let left: "xtz" | "tzbtc" = "tzbtc";
  let amountInXTZ = "";
  let amountInTzbtc = "";
  let userXtzBalance = 0;
  let userTzbtcBalance = 0;
  let tzBtcRate = 0;
  let slippage = 0.5;
  let tradeLoading = false;
  let tradeSuccessfull: false | 1 | 2 = false; // false = no data | 1 = successfull | 2 = failed
  let mtdFee: null | number = null;

  const updateTokenAmounts = e => {
    const val = e.target.value;
    if (isNaN(+val) || val.trim().length === 0) {
      e.target.value = "";
      amountInTzbtc = "";
      amountInXTZ = "";
      mtdFee = null;
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

    mtdFee = +amountInXTZ * 2 * config.mtdFee;
  };

  const trade = async () => {
    try {
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

      tradeLoading = true;
      tradeSuccessfull = false;

      const lbContract = await $store.Tezos.wallet.at(lbContractAddress);
      const deadline = new Date(Date.now() + 60000).toISOString();

      if (left === "tzbtc") {
        // selling tzbtc for xtz => tokenToXTZ
        const tzBtcContract = await $store.Tezos.wallet.at(
          $store.tokens.tzBTC.address
        );
        const tokensSold = Math.floor(
          +amountInTzbtc * 10 ** $store.tokens.tzBTC.decimals
        );
        const minXtzBought = Math.floor(
          +amountInXTZ * 10 ** 6 - (+amountInXTZ * 10 ** 6 * slippage) / 100
        );

        const batchOp = await $store.Tezos.wallet
          .batch()
          .withContractCall(tzBtcContract.methods.approve(lbContractAddress, 0))
          .withContractCall(
            tzBtcContract.methods.approve(lbContractAddress, tokensSold)
          )
          .withContractCall(
            lbContract.methods.tokenToXtz(
              $store.userAddress,
              tokensSold,
              minXtzBought,
              deadline
            )
          )
          .withTransfer({
            to: $store.admin,
            amount: Math.ceil(mtdFee * 10 ** 6),
            mutez: true
          })
          .send();
        await batchOp.confirmation();

        tradeLoading = false;
        tradeSuccessfull = 1;
        amountInTzbtc = "";
        amountInXTZ = "";
        setTimeout(() => (tradeSuccessfull = false), 2000);
      } else {
        // selling xtz for tzbtc => xtzToToken
        const formattedTzbtc = Math.floor(
          +amountInTzbtc * 10 ** $store.tokens.tzBTC.decimals
        );
        const minTokensBought = Math.floor(
          +formattedTzbtc - (+formattedTzbtc * slippage) / 100
        );

        const batchOp = await $store.Tezos.wallet
          .batch([
            {
              kind: OpKind.TRANSACTION,
              ...lbContract.methods
                .xtzToToken($store.userAddress, minTokensBought, deadline)
                .toTransferParams(),
              amount: +amountInXTZ * 10 ** 6,
              mutez: true
            },
            {
              kind: OpKind.TRANSACTION,
              to: $store.admin,
              amount: Math.ceil(mtdFee * 10 ** 6),
              mutez: true
            }
          ])
          .send();
        await batchOp.confirmation();

        /*const op = await lbContract.methods
          .xtzToToken($store.userAddress, minTokensBought, deadline)
          .send({ amount: +amountInXTZ * 10 ** 6, mutez: true });
        await op.confirmation();*/

        tradeLoading = false;
        tradeSuccessfull = 1;
        amountInTzbtc = "";
        amountInXTZ = "";
        setTimeout(() => (tradeSuccessfull = false), 2000);
      }
    } catch (error) {
      console.log(error);

      tradeLoading = false;
      tradeSuccessfull = 2;
      setTimeout(() => (tradeSuccessfull = false), 2000);
    }
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
  @import "../../styles/settings.scss";

  .material-icons {
    vertical-align: bottom;
  }

  .trade-inputs {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    margin: $std-v-margin 0px;

    .trade-input {
      display: flex;

      img {
        width: 30px;
        height: 30px;
        margin: 0px 20px;
      }

      input[type="text"] {
        border: solid 1px $container-bg-color;
        border-radius: 10px;
        padding: 5px;
        font-size: 1rem;
        outline: none;
        color: inherit;
      }

      .trade-input-balance {
        padding: 0px 15px;
        font-size: 0.7rem;
      }
    }

    span.material-icons {
      margin-top: -15px;
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
<div class="trade-inputs">
  {#if left === "tzbtc"}
    <div class="trade-input">
      <img src="images/tzBTC.png" alt="tzBTC-logo" />
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
          }}
        >
          Your balance: {+userTzbtcBalance.toFixed(5) / 1}
        </div>
      </div>
    </div>
    <span
      class="material-icons"
      on:click={() => (left = "xtz")}
      style="cursor:pointer"
    >
      sync_alt
    </span>
    <div class="trade-input">
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
          }}
        >
          Your balance: {+userXtzBalance.toFixed(5) / 1}
        </div>
      </div>
      <img src="images/XTZ.png" alt="XTZ-logo" />
    </div>
  {:else}
    <div class="trade-input">
      <img src="images/XTZ.png" alt="XTZ-logo" />
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
          }}
        >
          Your balance: {+userXtzBalance.toFixed(5) / 1}
        </div>
      </div>
    </div>
    <span
      class="material-icons"
      on:click={() => (left = "tzbtc")}
      style="cursor:pointer"
    >
      sync_alt
    </span>
    <div class="trade-input">
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
          }}
        >
          Your balance: {+userTzbtcBalance.toFixed(5) / 1}
        </div>
      </div>
      <img src="images/tzBTC.png" alt="tzBTC-logo" />
    </div>
  {/if}
</div>
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
<div style="font-size:0.7rem">
  {#if mtdFee}
    MTD fee: {formatTokenAmount(mtdFee)} XTZ
  {/if}
</div>
<br />
<div>
  {#if tradeLoading}
    <button class="primary loading" disabled>
      {#if left === "tzbtc"}
        Sell tzBTC
      {:else}
        Buy tzBTC
      {/if}
      <span class="material-icons"> sync </span>
    </button>
  {:else if tradeSuccessfull === 1}
    <button class="primary success" disabled>
      {#if left === "tzbtc"}
        Sell tzBTC
      {:else}
        Buy tzBTC
      {/if}
      <span class="material-icons"> thumb_up </span>
    </button>
  {:else if tradeSuccessfull === 2}
    <button class="primary error" disabled>
      {#if left === "tzbtc"}
        Sell tzBTC
      {:else}
        Buy tzBTC
      {/if}
      <span class="material-icons"> report_problem </span>
    </button>
  {:else}
    <button
      class="primary"
      style={`visibility:${
        +amountInTzbtc > 0 && +amountInXTZ > 0 ? "visible" : "hidden"
      }`}
      on:click={trade}
    >
      {#if left === "tzbtc"}
        Sell tzBTC
      {:else}
        Buy tzBTC
      {/if}
    </button>
  {/if}
</div>
