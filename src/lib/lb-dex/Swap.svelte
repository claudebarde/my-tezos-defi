<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import toastStore from "../../toastStore";
  import { formatTokenAmount } from "../../utils";
  import { AvailableToken, ToastType } from "../../types";
  import { xtzToTokenTokenOutput, tokenToXtzXtzOutput } from "./lbUtils";

  let coinToBuy: "xtz" | "tzbtc" = "xtz";
  let xtzValue = 1;
  let tzbtcValue = 0;
  let tzbtcBalance = 0;
  let xtzBalanceError = false;
  let tzbtcBalanceError = false;

  $: if (
    coinToBuy === "tzbtc" &&
    (!xtzValue || isNaN(xtzValue) || xtzValue > $store.userBalance / 10 ** 6)
  ) {
    xtzBalanceError = true;
  } else {
    xtzBalanceError = false;
  }

  $: if (
    coinToBuy === "xtz" &&
    (!tzbtcValue ||
      isNaN(tzbtcValue) ||
      tzbtcValue > tzbtcBalance / 10 ** $store.tokens.tzBTC.decimals)
  ) {
    tzbtcBalanceError = true;
  } else {
    tzbtcBalanceError = false;
  }

  const updateTzbtcValue = () => {
    if (!!xtzValue && !isNaN(xtzValue)) {
      const tokenOutput = xtzToTokenTokenOutput({
        xtzIn: xtzValue * 10 ** 6,
        xtzPool: $store.lbData.xtzPool,
        tokenPool: $store.lbData.tokenPool
      });
      if (tokenOutput) {
        tzbtcValue =
          tokenOutput.toNumber() / 10 ** $store.tokens.tzBTC.decimals;
      } else {
        toastStore.addToast({
          type: ToastType.ERROR,
          message: "Unable to get tzBTC value for swap",
          dismissable: true
        });
      }
    } else {
      tzbtcValue = null;
    }
  };

  const updateXtzValue = () => {
    if (!!tzbtcValue && !isNaN(tzbtcValue)) {
      const xtzOutput = tokenToXtzXtzOutput({
        tokenIn: tzbtcValue * 10 ** $store.tokens.tzBTC.decimals,
        xtzPool: $store.lbData.xtzPool,
        tokenPool: $store.lbData.tokenPool
      });
      if (xtzOutput) {
        xtzValue = xtzOutput.toNumber() / 10 ** 6;
      } else {
        toastStore.addToast({
          type: ToastType.ERROR,
          message: "Unable to get XTZ value for swap",
          dismissable: true
        });
      }
    } else {
      xtzValue = null;
    }
  };

  afterUpdate(() => {
    // finds user balance in tzBTC
    const tzbtc = $store.userTokens.find(
      token => token.name === AvailableToken.tzBTC
    );
    if (tzbtc) {
      tzbtcBalance = tzbtc.balance;
    } else {
      tzbtcBalance = 0;
    }
    // converts 1 XTZ to tzBTC
    if (
      xtzValue === 1 &&
      tzbtcValue === 0 &&
      $store.lbData.xtzPool > 0 &&
      $store.lbData.tokenPool > 0 &&
      $store.lbData.lqtTotal > 0
    ) {
      const tokenValue = xtzToTokenTokenOutput({
        xtzIn: 1 * 10 ** 6,
        xtzPool: $store.lbData.xtzPool,
        tokenPool: $store.lbData.tokenPool
      });
      if (tokenValue) {
        tzbtcValue = tokenValue.toNumber() / 10 ** $store.tokens.tzBTC.decimals;
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .form {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 20px;

    button.mini {
      .material-icons-outlined {
        margin: 0px;
      }
    }

    input {
      padding: 10px;
      font-size: 0.9rem;
      border: solid 3px transparent;
      border-radius: $std-border-radius;
      background-color: $light-cyan;
      color: inherit;
      outline: none;

      &:focus {
        border-color: $middle-blue;
      }

      &::-webkit-inner-spin-button,
      &::-webkit-outer-spin-button {
        opacity: 0;
      }

      &.error {
        border-color: $international-orange-aerospace;
      }
    }

    .lb-balance {
      display: block;
      text-align: right;
      font-size: 0.7rem;
    }
  }
</style>

{#if $store.lbData.xtzPool > 0 && $store.lbData.tokenPool > 0 && $store.lbData.lqtTotal > 0}
  <div class="form">
    {#if coinToBuy === "xtz"}
      <label for="xtz-input">
        <span>&nbsp;&nbsp;XTZ:</span>
        <input
          type="number"
          id="xtz-input"
          bind:value={xtzValue}
          on:input={updateTzbtcValue}
        />
        <span class="lb-balance">
          Balance: {formatTokenAmount($store.userBalance / 10 ** 6)} XTZ
        </span>
      </label>
    {:else}
      <label for="tzbtc-input">
        <span>tzBTC:</span>
        <input
          type="number"
          id="tzbtc-input"
          bind:value={tzbtcValue}
          on:input={updateXtzValue}
        />
        <span class="lb-balance">
          Balance: {formatTokenAmount(
            tzbtcBalance / 10 ** $store.tokens.tzBTC.decimals
          )} tzBTC
        </span>
      </label>
    {/if}
    <button
      class="primary mini round"
      on:click={() => {
        if (coinToBuy === "xtz") {
          coinToBuy = "tzbtc";
        } else {
          coinToBuy = "xtz";
        }
      }}
    >
      <span class="material-icons-outlined"> swap_vert </span>
    </button>
    {#if coinToBuy === "xtz"}
      <label for="tzbtc-input">
        <span>tzBTC:</span>
        <input
          type="number"
          id="tzbtc-input"
          class:error={tzbtcBalanceError}
          bind:value={tzbtcValue}
          on:input={updateXtzValue}
          disabled
        />
        <span class="lb-balance">
          Balance: {formatTokenAmount(
            tzbtcBalance / 10 ** $store.tokens.tzBTC.decimals
          )} tzBTC
        </span>
      </label>
    {:else}
      <label for="xtz-input">
        <span>&nbsp;&nbsp;XTZ:</span>
        <input
          type="number"
          id="xtz-input"
          class:error={xtzBalanceError}
          bind:value={xtzValue}
          on:input={updateTzbtcValue}
        />
        <span class="lb-balance">
          Balance: {formatTokenAmount($store.userBalance / 10 ** 6)} XTZ
        </span>
      </label>
    {/if}
    {#if (coinToBuy === "xtz" && tzbtcBalanceError) || (coinToBuy === "tzbtc" && xtzBalanceError)}
      <button class="primary">
        <span class="material-icons-outlined">
          sentiment_very_dissatisfied
        </span>
        Invalid swap
      </button>
    {:else}
      <button class="primary">
        Buy {coinToBuy === "xtz"
          ? formatTokenAmount(xtzValue)
          : formatTokenAmount(tzbtcValue, 8)}
        {coinToBuy === "xtz" ? "XTZ" : "tzBTC"}
      </button>
    {/if}
  </div>
{:else}
  <div>Loading liquidity baking DEX data...</div>
{/if}
