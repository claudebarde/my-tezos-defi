<script lang="ts">
  import { afterUpdate } from "svelte";
  import { AsyncData } from "@swan-io/boxed";
  import { location } from "svelte-spa-router";
  import store from "../store";
  import {
    formatTokenAmount,
    calculateTrend,
    fetchTezosDomain
  } from "../utils";
  import type { TezosAccountAddress } from "../types";

  export let profileAddress: TezosAccountAddress;

  let xtzPrice24hourDifference: number | undefined = undefined;
  let xtzTrend;
  let totalTokensBalance: number;
  let tzDomainName: string;
  let xtzBalance: AsyncData<number> = AsyncData.NotAsked();

  afterUpdate(async () => {
    if (!profileAddress && $store.userAddress) {
      profileAddress = $store.userAddress;
    } else if (profileAddress && !tzDomainName) {
      xtzBalance = AsyncData.Loading();

      // fetches the Tezos domain name
      tzDomainName = await fetchTezosDomain($store.Tezos, profileAddress);
      // fetches the balance
      const balance = await $store.Tezos.tz.getBalance(profileAddress);
      if (balance) {
        xtzBalance = AsyncData.Done(balance.toNumber());
      } else {
        xtzBalance = AsyncData.Done(0);
      }
    }

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
      padding: 0px;
      margin-bottom: 0px;
    }
  }
</style>

<div class="user-details">
  <div>
    <img
      src={`https://services.tzkt.io/v1/avatars/${profileAddress}`}
      alt="identicon"
    />
  </div>
  <div class="user-details__info">
    <div>
      {#if tzDomainName}
        <a
          href={`https://tzkt.io/${profileAddress}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tzDomainName}
        </a>
      {:else}
        <span>Loading the Tezos domain...</span>
      {/if}
    </div>
    <div class:blurry-text={$store.blurryBalances}>
      {#if xtzBalance.isLoading()}
        <span>Loading the balance...</span>
      {:else if xtzBalance.isDone()}
        {formatTokenAmount(xtzBalance.getWithDefault(0) / 10 ** 6)} ꜩ
        {#if $store.xtzExchangeRate}
          ({$store.localStorage.getFavoriteFiat().symbol}{formatTokenAmount(
            (xtzBalance.getWithDefault(0) / 10 ** 6) * $store.xtzExchangeRate,
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
  {#if $location === "/" && $store.userTokens && $store.userTokens.length > 0}
    <div class="tokens-info">
      <p>{$store.userTokens.length} tokens with balance</p>
      <p class:blurry-text={$store.blurryBalances}>
        Total value: {formatTokenAmount(totalTokensBalance)} ꜩ
      </p>
      <p class:blurry-text={$store.blurryBalances}>
        ({formatTokenAmount(+totalTokensBalance * $store.xtzExchangeRate, 2)} USD)
      </p>
    </div>
  {:else}
    <div />
  {/if}
</div>
