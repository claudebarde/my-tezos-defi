<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import toastStore from "../Toast/toastStore";

  export let lbContractAddress, tokenPool, xtzPool;

  let left: "xtz" | "tzbtc" = "tzbtc";
  let amountInXTZ = "";
  let amountInTzbtc = "";
  let tzBtcRate = 0;
  let slippage = 0.5;

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
      amountInXTZ = (+amountInTzbtc * +tzBtcRate).toString();
    } else {
      amountInXTZ = val;
      amountInTzbtc = (+amountInXTZ / +tzBtcRate).toString();
    }
  };

  const trade = async () => {
    try {
      if (isNaN(+amountInXTZ)) {
        const text = "XTZ amount must be a number";
        toastStore.addToast({ type: "error", text, dismissable: true });
        throw text;
      }
      if (isNaN(+amountInTzbtc)) {
        const text = "tzBTC amount must be a number";
        toastStore.addToast({ type: "error", text, dismissable: true });
        throw text;
      }

      if (left === "tzbtc") {
        // selling tzbtc for xtz => tokenToXTZ
        const tzBtcContract = await $store.Tezos.wallet.at(
          $store.tokens.tzBTC.address
        );
        const lbContract = await $store.Tezos.wallet.at(lbContractAddress);
        const tokensSold = Math.floor(
          +amountInTzbtc * 10 ** $store.tokens.tzBTC.decimals
        );
        const minXtzBought =
          +amountInXTZ * 10 ** 6 - (+amountInXTZ * 10 ** 6 * slippage) / 100;

        const batchOp = await $store.Tezos.wallet
          .batch()
          .withContractCall(tzBtcContract.methods.approve(lbContractAddress, 0))
          .withContractCall(
            tzBtcContract.methods.approve(lbContractAddress, tokensSold)
          )
          .withContractCall(
            lbContract.methods.tokenToXTZ(
              $store.userAddress,
              tokensSold,
              minXtzBought,
              Date.now() + 60000 * 3
            )
          )
          .send();
        await batchOp.confirmation();
      } else {
        // selling xtz for tzbtc => xtzToToken
      }
    } catch (error) {
      console.log(error);
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
  });
</script>

<style lang="scss">
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
<br />
<div class="trade-inputs">
  {#if left === "tzbtc"}
    <img src="images/tzBTC.png" alt="tzBTC-logo" />
    <div>
      <input
        type="text"
        value={amountInTzbtc}
        id="input-tzbtc-amount"
        on:input={updateTokenAmounts}
      />
      <div class="trade-input-balance">
        Your balance: {+$store.tokensBalances.tzBTC.toFixed(5) / 1}
      </div>
    </div>
    <span
      class="material-icons"
      on:click={() => (left = "xtz")}
      style="cursor:pointer"
    >
      sync_alt
    </span>
    <div>
      <input
        type="text"
        id="input-xtz-amount"
        value={amountInXTZ}
        on:input={updateTokenAmounts}
      />
      <div class="trade-input-balance">
        Your balance: {+($store.xtzData.balance / 10 ** 6).toFixed(5) / 1}
      </div>
    </div>
    <img src="images/XTZ.png" alt="XTZ-logo" />
  {:else}
    <img src="images/XTZ.png" alt="XTZ-logo" />
    <div>
      <input
        type="text"
        id="input-xtz-amount"
        value={amountInXTZ}
        on:input={updateTokenAmounts}
      />
      <div class="trade-input-balance">
        Your balance: {+($store.xtzData.balance / 10 ** 6).toFixed(5) / 1}
      </div>
    </div>
    <span
      class="material-icons"
      on:click={() => (left = "tzbtc")}
      style="cursor:pointer"
    >
      sync_alt
    </span>
    <div>
      <input
        type="text"
        value={amountInTzbtc}
        id="input-tzbtc-amount"
        on:input={updateTokenAmounts}
      />
      <div class="trade-input-balance">
        Your balance: {+$store.tokensBalances.tzBTC.toFixed(5) / 1}
      </div>
    </div>
    <img src="images/tzBTC.png" alt="tzBTC-logo" />
  {/if}
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
  <button
    class="button main"
    style={`visibility:${amountInTzbtc && amountInXTZ ? "visible" : "hidden"}`}
  >
    {#if left === "tzbtc"}
      Sell tzBTC
    {:else}
      Sell XTZ
    {/if}
  </button>
</div>
