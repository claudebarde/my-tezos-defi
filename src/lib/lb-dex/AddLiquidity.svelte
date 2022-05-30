<script lang="ts">
  import { afterUpdate } from "svelte";
  import { AsyncData, Option } from "@swan-io/boxed";
  import store from "../../store";
  import { formatTokenAmount } from "../../utils";
  import { xtzToTokenTokenOutput, tokenToXtzXtzOutput } from "./lbUtils";
  import toastStore from "../../toastStore";
  import { AvailableToken, ToastType } from "../../types";

  let xtzValue = 0;
  let tzbtcValue = 0;
  let minLqtMinted = Option.None<number>();
  let tzbtcBalance = 0;
  let slippage = 0.5;
  let xtzError = false;
  let tzbtcError = false;
  let liquidityLoading: AsyncData<boolean> = AsyncData.NotAsked();
  let swapSuccessfull = false;

  const calcMinLqtMinted = () => {
    const val = Math.floor(
      (xtzValue * 10 ** 6 * $store.lbData.lqtTotal) / $store.lbData.xtzPool
    );
    if (!isNaN(val)) {
      minLqtMinted = Option.Some(val);
    } else {
      minLqtMinted = Option.None();
    }
  };

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
        calcMinLqtMinted();
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
        calcMinLqtMinted();
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

  const addLiquidity = async () => {
    console.log("add liquidity");
  };

  afterUpdate(() => {
    // checks if the user has enough balance
    if (xtzValue < 0 || $store.userBalance < xtzValue * 10 ** 6) {
      xtzError = true;
    } else {
      xtzError = false;
    }

    const tzbtc = $store.userTokens.find(
      token => token.name === AvailableToken.tzBTC
    );
    if (tzbtc) {
      tzbtcBalance = tzbtc.balance;
    } else {
      tzbtcBalance = 0;
    }

    if (tzbtcValue < 0 || tzbtcBalance < tzbtcValue) {
      tzbtcError = true;
    } else {
      tzbtcError = false;
    }
  });
</script>

{#if $store.lbData.xtzPool > 0 && $store.lbData.tokenPool > 0 && $store.lbData.lqtTotal > 0}
  <div class="lb-form">
    <div class="form-input">
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
          <span class="material-symbols-outlined"> add_circle </span>
        </button>
        <button
          class="transparent mini"
          on:click={() => {
            if (slippage > 0.5) {
              slippage -= 0.5;
            }
          }}
        >
          <span class="material-symbols-outlined"> do_not_disturb_on </span>
        </button>
      </div>
      {#if xtzValue && tzbtcValue}
        <p>
          LQT received: {minLqtMinted.match({
            None: () => "0",
            Some: val => formatTokenAmount(val, 8)
          })} tokens
        </p>
      {/if}
    </div>
    {#if tzbtcError || xtzError}
      <button class="primary">
        <span class="material-icons-outlined">
          sentiment_very_dissatisfied
        </span>
        Invalid operation
      </button>
    {:else if (xtzValue === 0 || xtzValue === null) && (tzbtcValue === 0 || tzbtcValue === null)}
      <button class="primary"> Enter an amount to add liquidity </button>
    {:else if liquidityLoading.isNotAsked()}
      <button class="primary" on:click={addLiquidity}> Add liquidity </button>
    {:else if liquidityLoading.isLoading()}
      <button class="primary" disabled>
        <span class="material-icons-outlined loading"> hourglass_empty </span>
        Adding liquidity...
      </button>
    {:else if liquidityLoading.isDone() && swapSuccessfull === true}
      <button class="primary" disabled> Liquidity successfully added! </button>
    {:else if liquidityLoading.isDone() && swapSuccessfull === false}
      <button class="primary" disabled> An error occured </button>
    {/if}
  </div>
{:else}
  <div>Loading liquidity baking DEX data...</div>
{/if}
