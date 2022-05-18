<script lang="ts">
  import { afterUpdate } from "svelte";
  import { page } from "$app/stores";
  import store from "../store";
  import { formatTokenAmount, calculateTrend } from "../utils";

  let xtzPrice24hourDifference: number | undefined = undefined;
  let xtzTrend;
  let totalTokensBalance: number;

  afterUpdate(() => {
    if ($store.xtzPriceHistoric && $store.xtzPriceHistoric.length > 0) {
      // calculate XTZ monthly trend
      xtzTrend = calculateTrend($store.xtzPriceHistoric, "XTZ");
      // calculate 24 hour trend
      const yesterdayPrice =
        $store.xtzPriceHistoric[$store.xtzPriceHistoric.length - 2].price;
      const todayPrice = $store.xtzExchangeRate;
      xtzPrice24hourDifference =
        ((todayPrice - yesterdayPrice) / todayPrice) * 100;
    }

    if ($store.tokens && $store.userTokens) {
      totalTokensBalance = [
        0,
        0,
        ...$store.userTokens.map(
          tk =>
            (tk.balance / 10 ** $store.tokens[tk.name].decimals) *
            $store.tokens[tk.name].getExchangeRate()
        )
      ].reduce((a, b) => a + b);
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .user-details {
    width: 80%;
    margin: 0 auto;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 40px;
    padding: 20px;
    border-radius: $std-border-radius;
    margin-bottom: 30px;

    img {
      border-radius: 50%;
      width: 128px;
      height: 128px;
    }

    .user-details__info {
      height: 100px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
    }

    .tokens-info {
      text-align: center;
    }
  }

  @media (max-width: $mobile-breakpoint) {
    .user-details {
      flex-direction: column;
      gap: 20px;
      text-align: center;
    }
  }
</style>

<div class="user-details">
  <div>
    <img
      src={`https://services.tzkt.io/v1/avatars/${$store.userAddress}`}
      alt="identicon"
    />
  </div>
  <div class="user-details__info">
    <div>
      {#if $store.userName}
        <a
          href={`https://tzkt.io/${$store.userAddress}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {$store.userName}
        </a>
      {:else}
        <span>Loading...</span>
      {/if}
    </div>
    <div>
      {#if $store.userBalance}
        {formatTokenAmount($store.userBalance / 10 ** 6)} ꜩ
        {#if $store.xtzExchangeRate}
          (${formatTokenAmount(
            ($store.userBalance / 10 ** 6) * $store.xtzExchangeRate,
            2
          )})
        {/if}
      {/if}
    </div>
    {#if xtzTrend && xtzPrice24hourDifference}
      <div
        style={xtzTrend.trend === "down" ? "color:#f50010ff" : "color:#50C878"}
      >
        {#if xtzTrend.trend === "down"}
          <span class="material-icons-outlined"> arrow_downward </span>
          -{formatTokenAmount(Math.abs(xtzPrice24hourDifference), 2)}%
        {:else}
          <span class="material-icons-outlined"> arrow_upward </span>
          {formatTokenAmount(Math.abs(xtzPrice24hourDifference), 2)}%
        {/if}
      </div>
    {/if}
  </div>
  {#if $page.url.pathname === "/" && $store.userTokens && $store.userTokens.length > 0}
    <div class="tokens-info">
      <p>{$store.userTokens.length} tokens with balance</p>
      <p>Total value: {formatTokenAmount(totalTokensBalance)} ꜩ</p>
      <p>
        ({formatTokenAmount(+totalTokensBalance * $store.xtzExchangeRate, 2)} USD)
      </p>
    </div>
  {:else}
    <div />
  {/if}
</div>
