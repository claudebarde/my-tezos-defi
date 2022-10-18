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
  let xtzValue = 0;
  let tzbtcValue = 0;
  let tzbtcBalance = 0;
  let xtzError = false;
  let tzbtcError = false;
  let slippage = 0.5;
  let swapLoading: AsyncData<boolean> = AsyncData.NotAsked();
  let swapSuccessfull = false;

  const updateTzbtcValue = () => {
    if (!!xtzValue && !isNaN(xtzValue) && xtzValue > 0) {
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
    if (!!tzbtcValue && !isNaN(tzbtcValue) && tzbtcValue > 0) {
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
    // checks if the user has enough tokens
    if (
      coinToBuy === "xtz" &&
      tzbtcValue > tzbtcBalance * 10 ** $store.tokens.tzBTC.decimals
    ) {
      tzbtcError = true;
    } else {
      tzbtcError = false;
    }

    if (coinToBuy === "tzbtc" && xtzValue > $store.userBalance / 10 ** 6) {
      xtzError = true;
    } else {
      xtzError = false;
    }
  });
</script>

{#if $store.lbData.xtzPool > 0 && $store.lbData.tokenPool > 0 && $store.lbData.lqtTotal > 0}
  <div class="lb-form">
    <div class="form-input">
      {#if coinToBuy === "xtz"}
        <label for="xtz-input" class:error={tzbtcError}>
          <div class="input-token">
            <img src="tokens/XTZ.png" alt="xtz-token" />
          </div>
          <div class="input-value">
            <input
              type="number"
              id="xtz-input"
              bind:value={xtzValue}
              on:input={updateTzbtcValue}
              on:focus={() => {
                if (xtzValue === 0) xtzValue = null;
              }}
            />
          </div>
          <div class="input-token-balance">
            <p>Balance</p>
            <p>{formatTokenAmount($store.userBalance / 10 ** 6)}</p>
          </div>
        </label>
      {:else}
        <label for="tzbtc-input" class:error={xtzError}>
          <div class="input-token">
            <img src="tokens/tzBTC.png" alt="xtz-token" />
          </div>
          <div class="input-value">
            <input
              type="number"
              id="tzbtc-input"
              bind:value={tzbtcValue}
              on:input={updateXtzValue}
              on:focus={() => {
                if (tzbtcValue === 0) tzbtcValue = null;
              }}
            />
          </div>
          <div class="input-token-balance">
            <p>Balance</p>
            <p>
              {formatTokenAmount(
                tzbtcBalance / 10 ** $store.tokens.tzBTC.decimals,
                6
              )}
            </p>
          </div>
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
        <label for="tzbtc-input" class:error={tzbtcError}>
          <div class="input-token">
            <img src="tokens/tzBTC.png" alt="xtz-token" />
          </div>
          <div class="input-value">
            <input
              type="number"
              id="tzbtc-input"
              bind:value={tzbtcValue}
              on:input={updateXtzValue}
              on:focus={() => {
                if (tzbtcValue === 0) tzbtcValue = null;
              }}
            />
          </div>
          <div class="input-token-balance">
            <p>Balance</p>
            <p>
              {formatTokenAmount(
                tzbtcBalance / 10 ** $store.tokens.tzBTC.decimals,
                6
              )}
            </p>
          </div>
        </label>
      {:else}
        <label for="xtz-input" class:error={xtzError}>
          <div class="input-token">
            <img src="tokens/XTZ.png" alt="xtz-token" />
          </div>
          <div class="input-value">
            <input
              type="number"
              id="xtz-input"
              bind:value={xtzValue}
              on:input={updateTzbtcValue}
              on:focus={() => {
                if (xtzValue === 0) xtzValue = null;
              }}
            />
          </div>
          <div class="input-token-balance">
            <p>Balance</p>
            <p>{formatTokenAmount($store.userBalance / 10 ** 6)}</p>
          </div>
        </label>
      {/if}
    </div>
    <div class="swap-info">
      <div class="select-slippage">
        <p>Slippage: {slippage}%</p>
        <button
          class="transparent mini"
          on:click={() => {
            if (slippage < 100) {
              slippage += 0.5;
            }
          }}
        >
          <span class="material-icons-outlined"> add_circle_outline </span>
        </button>
        <button
          class="transparent mini"
          on:click={() => {
            if (slippage > 0.5) {
              slippage -= 0.5;
            }
          }}
        >
          <span class="material-icons-outlined"> do_not_disturb_on </span>
        </button>
      </div>
      {#if xtzValue && tzbtcValue}
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
      {/if}
    </div>
    {#if (coinToBuy === "xtz" && tzbtcError) || (coinToBuy === "tzbtc" && xtzError)}
      <button class="primary">
        <span class="material-icons-outlined">
          sentiment_very_dissatisfied
        </span>
        Invalid swap
      </button>
    {:else if (xtzValue === 0 || xtzValue === null) && (tzbtcValue === 0 || tzbtcValue === null)}
      <button class="primary"> Enter an amount to swap </button>
    {:else if swapLoading.isNotAsked()}
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
  </div>
{:else}
  <div>Loading liquidity baking DEX data...</div>
{/if}
