<script lang="ts">
  import { onMount } from "svelte";
  import store from "../store";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import Swap from "$lib/lb-dex/Swap.svelte";
  import AddLiquidity from "$lib/lb-dex/AddLiquidity.svelte";
  import RemoveLiquidity from "$lib/lb-dex/RemoveLiquidity.svelte";
  import { formatTokenAmount, calculateLqtOutput } from "../utils";
  import { tokenToXtzXtzOutput } from "$lib/lb-dex/lbUtils";

  let activeTab: "trade" | "add-liquidity" | "remove-liquidity" = "trade";
  let btcPrice: number = undefined;
  let tzbtcPrice: number = undefined;

  const calcLqtValueInFiat = (lqTokens: number): number => {
    const { xtz, tokens } = calculateLqtOutput({
      lqTokens,
      xtzPool: $store.lbData.xtzPool,
      tokenPool: $store.lbData.tokenPool,
      lqtTotal: $store.lbData.lqtTotal,
      tokenDecimal: $store.tokens.tzBTC.decimals
    });
    if (!isNaN(xtz) && !isNaN(tokens)) {
      return (
        xtz * $store.xtzExchangeRate +
        tokens * $store.tokens.tzBTC.getExchangeRate()
      );
    } else {
      return 0;
    }
  };

  onMount(async () => {
    // fetches Bitcoin exchange rate from CoinGecko
    const btcPriceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=btc`
    );
    if (btcPriceRes && btcPriceRes.status === 200) {
      const btcPriceVal = await btcPriceRes.json();
      const xtzToBtc = btcPriceVal.tezos.btc;
      if (!isNaN(xtzToBtc)) {
        btcPrice = 1 / xtzToBtc;
      }
    }
    // calculates tzBTC exchange rate
    if ($store.lbData.xtzPool && $store.lbData.tokenPool) {
      const xtzOutput = tokenToXtzXtzOutput({
        tokenIn: 10 ** $store.tokens.tzBTC.decimals,
        xtzPool: $store.lbData.xtzPool,
        tokenPool: $store.lbData.tokenPool
      });
      if (xtzOutput) {
        tzbtcPrice = xtzOutput.toNumber() / 10 ** 6;
      }
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .tabs {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    background-color: $light-cyan;
    border-radius: $std-border-radius;
    padding: 10px;
    margin-bottom: 50px;

    .tab {
      button {
        border: none;
        background-color: transparent;
        font-size: 1rem;

        &.active {
          background-color: $middle-blue;
        }
      }
    }
  }

  .lb-stats {
    width: 80%;
    margin-bottom: 50px;
    text-align: center;
    display: flex;
    justify-content: space-around;
    align-items: center;
    gap: 30px;

    .fiat-value {
      font-size: 0.7rem;
    }
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader profileAddress={$store.userAddress} />
  {/if}
  <div class="tabs">
    <div class="tab">
      <button
        class:active={activeTab === "trade"}
        on:click={() => (activeTab = "trade")}>Trade</button
      >
    </div>
    <div class="tab">
      <button
        class:active={activeTab === "add-liquidity"}
        on:click={() => (activeTab = "add-liquidity")}
      >
        Add liquidity
      </button>
    </div>
    <div class="tab">
      <button
        class:active={activeTab === "remove-liquidity"}
        on:click={() => (activeTab = "remove-liquidity")}
      >
        Remove liquidity
      </button>
    </div>
  </div>
  {#if $store.lbData.xtzPool > 0 && $store.lbData.tokenPool > 0}
    <div class="lb-stats">
      <div>
        <p><b>XTZ in DEX</b></p>
        <p>{formatTokenAmount($store.lbData.xtzPool / 10 ** 6)}</p>
        <p class="fiat-value">
          ({formatTokenAmount(
            ($store.lbData.xtzPool / 10 ** 6) * $store.xtzExchangeRate,
            2
          )} USD)
        </p>
      </div>
      <div>
        <p><b>tzBTC in DEX</b></p>
        <p>
          {formatTokenAmount(
            $store.lbData.tokenPool / 10 ** $store.tokens.tzBTC.decimals
          )}
        </p>
        <p class="fiat-value">
          ({formatTokenAmount(
            ($store.lbData.tokenPool / 10 ** $store.tokens.tzBTC.decimals) *
              $store.tokens.tzBTC.getExchangeRate(),
            2
          )} USD)
        </p>
      </div>
      <div>
        <p><b>SIRIUS in DEX</b></p>
        <p>{formatTokenAmount($store.lbData.lqtTotal)} tokens</p>
        <p class="fiat-value">
          ({formatTokenAmount(calcLqtValueInFiat($store.lbData.lqtTotal), 2)} USD)
        </p>
      </div>
      {#if btcPrice && tzbtcPrice}
        <div>
          <p><b>BTC & tzBTC</b></p>
          <p>1 BTC = {formatTokenAmount(btcPrice, 2)} XTZ</p>
          <p>
            1 tzBTC = {formatTokenAmount(tzbtcPrice, 2)} XTZ
          </p>
        </div>
      {/if}
    </div>
  {/if}
  <div>
    {#if !$store.userAddress}
      <p>Please connect your wallet to continue</p>
    {:else}
      <!-- LB ACTIONS -->
      {#if activeTab === "trade"}
        <Swap />
      {:else if activeTab === "add-liquidity"}
        <AddLiquidity />
      {:else if activeTab === "remove-liquidity"}
        <RemoveLiquidity />
      {/if}
    {/if}
  </div>
</div>
