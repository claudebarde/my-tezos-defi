<script lang="ts">
  import { afterUpdate } from "svelte";
  import { AsyncData } from "@swan-io/boxed";
  import { OpKind } from "@taquito/taquito";
  import store from "../../store";
  import toastStore from "../../toastStore";
  import { formatTokenAmount, findTzbtcBalance } from "../../utils";
  import { AvailableToken, ToastType } from "../../types";
  import { xtzToTokenTokenOutput, tokenToXtzXtzOutput } from "./lbUtils";
  import config from "../../config";

  let coinToBuy: "xtz" | "tzbtc" = "xtz";
  let xtzValue = 1;
  let tzbtcValue = 0;
  let tzbtcBalance = 0;
  let xtzBalanceError = false;
  let tzbtcBalanceError = false;
  let slippage = 0.5;
  let swapLoading: AsyncData<boolean> = AsyncData.NotAsked();
  let swapSuccessfull = false;

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

  const swap = async () => {
    try {
      if (isNaN(+xtzValue) || isNaN(+tzbtcValue)) {
        return;
      }
      swapLoading = AsyncData.Loading();
      swapSuccessfull = false;
      const lbContract = await $store.Tezos.wallet.at(config.lbContractAddress);
      const deadline = new Date(Date.now() + 60000).toISOString();
      if (coinToBuy === "xtz") {
        // selling tzbtc for xtz => tokenToXTZ
        const tzBtcContract = await $store.Tezos.wallet.at(
          $store.tokens.tzBTC.address
        );
        const tokensSold = Math.floor(
          +tzbtcValue * 10 ** $store.tokens.tzBTC.decimals
        );
        const minXtzBought = calcSlippageValue();
        let batch = $store.Tezos.wallet
          .batch()
          .withContractCall(
            tzBtcContract.methods.approve(config.lbContractAddress, 0)
          )
          .withContractCall(
            tzBtcContract.methods.approve(config.lbContractAddress, tokensSold)
          )
          .withContractCall(
            lbContract.methods.tokenToXtz(
              $store.userAddress,
              tokensSold,
              minXtzBought,
              deadline
            )
          );
        if ($store.serviceFee) {
          batch = batch.withTransfer({
            to: $store.admin,
            amount: Math.ceil($store.serviceFee * 10 ** 6),
            mutez: true
          });
        }
        const batchOp = await batch.send();
        await batchOp.confirmation();
      } else {
        // selling xtz for tzbtc => xtzToToken
        const minTokensBought = calcSlippageValue();
        let batch = $store.Tezos.wallet.batch([
          {
            kind: OpKind.TRANSACTION,
            ...lbContract.methods
              .xtzToToken($store.userAddress, minTokensBought, deadline)
              .toTransferParams(),
            amount: +xtzValue * 10 ** 6,
            mutez: true
          }
        ]);
        if ($store.serviceFee) {
          batch = batch.withTransfer({
            to: $store.admin,
            amount: Math.ceil($store.serviceFee * 10 ** 6),
            mutez: true
          });
        }

        const batchOp = await batch.send();
        await batchOp.confirmation();
        /*const op = await lbContract.methods
          .xtzToToken($store.userAddress, minTokensBought, deadline)
          .send({ amount: +amountInXTZ * 10 ** 6, mutez: true });
        await op.confirmation();*/
      }
      toastStore.addToast({
        type: ToastType.SUCCESS,
        message: `${
          coinToBuy === "xtz" ? "XTZ" : "tzBTC"
        } successfully bought!`,
        dismissable: true
      });
      tzbtcValue = null;
      xtzValue = null;
      swapLoading = AsyncData.Done(true);
      swapSuccessfull = true;
      setTimeout(() => (swapSuccessfull = false), 2000);
      // fetches new XTZ balance
      const xtzBalance = await $store.Tezos.tz.getBalance($store.userAddress);
      if (xtzBalance) {
        store.updateUserBalance(xtzBalance.toNumber());
      }
      // fetches new tzBTC balance
      const tzBtcContract = await $store.Tezos.wallet.at(
        $store.tokens.tzBTC.address
      );
      const tzBtcStorage: any = await tzBtcContract.storage();
      const newTzbtcBalance = await findTzbtcBalance(
        tzBtcStorage[0],
        $store.userAddress,
        $store.tokens.tzBTC.decimals
      );
      if (newTzbtcBalance) {
        tzbtcBalance = newTzbtcBalance;
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: ToastType.ERROR,
        message: "An error occured during the swap",
        dismissable: true
      });
      swapLoading = AsyncData.Done(true);
      swapSuccessfull = true;
      setTimeout(() => (swapSuccessfull = false), 2000);
    }
  };

  $: calcSlippageValue = (formatWithDecimals = false): number => {
    if (coinToBuy === "xtz") {
      const tokens = Math.floor(
        +xtzValue * 10 ** 6 - (+xtzValue * 10 ** 6 * slippage) / 100
      );
      if (formatWithDecimals) {
        return tokens / 10 ** 6;
      } else {
        return tokens;
      }
    } else {
      const formattedTzbtc = Math.floor(
        +tzbtcValue * 10 ** $store.tokens.tzBTC.decimals
      );
      const tokens = Math.floor(
        +formattedTzbtc - (+formattedTzbtc * slippage) / 100
      );
      if (formatWithDecimals) {
        return tokens / 10 ** $store.tokens.tzBTC.decimals;
      } else {
        return tokens;
      }
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

    .swap-info {
      text-align: center;
      font-size: 0.9rem;
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
    <div class="swap-info">
      <p>Slippage: {slippage}%</p>
      <p>
        Minimum received: {formatTokenAmount(calcSlippageValue(true), 8)}
        {coinToBuy === "xtz" ? "XTZ" : "tzBTC"}
      </p>
      <p>
        {formatTokenAmount(xtzValue)} XTZ = {formatTokenAmount(
          xtzValue * $store.xtzExchangeRate
        )} USD
      </p>
      <p>
        {formatTokenAmount(tzbtcValue, 8)} tzBTC = {formatTokenAmount(
          tzbtcValue *
            $store.tokens.tzBTC.getExchangeRate() *
            $store.xtzExchangeRate
        )} USD
      </p>
    </div>
    {#if (coinToBuy === "xtz" && tzbtcBalanceError) || (coinToBuy === "tzbtc" && xtzBalanceError)}
      <button class="primary">
        <span class="material-icons-outlined">
          sentiment_very_dissatisfied
        </span>
        Invalid swap
      </button>
    {:else}
      <!-- SWAP BUTTON-->
      {#if swapLoading.isNotAsked()}
        <button class="primary" on:click={swap}>
          Buy {coinToBuy === "xtz"
            ? formatTokenAmount(xtzValue)
            : formatTokenAmount(tzbtcValue, 8)}
          {coinToBuy === "xtz" ? "XTZ" : "tzBTC"}
        </button>
      {:else if swapLoading.isLoading()}
        <button class="primary" disabled>
          <span class="material-icons-outlined loading"> hourglass_empty </span>
          Swapping...
        </button>
      {:else if swapLoading.isDone() && swapSuccessfull === true}
        <button class="primary" disabled> Swap successful! </button>
      {:else if swapLoading.isDone() && swapSuccessfull === false}
        <button class="primary" disabled> An error occured </button>
      {/if}
    {/if}
  </div>
{:else}
  <div>Loading liquidity baking DEX data...</div>
{/if}
