<script lang="ts">
  import { afterUpdate, createEventDispatcher } from "svelte";
  import { slide, fly } from "svelte/transition";
  import type { Option } from "@swan-io/boxed";
  import {
    type InvestmentData,
    AvailableToken,
    AvailableInvestment
  } from "../../types";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";

  export let invData: InvestmentData,
    stake: number,
    stakeInXtz: number,
    rewards: Option<number> | Option<Array<number>>,
    harvesting: boolean,
    pos: number;

  const dispatch = createEventDispatcher();
  let localRewards: number | Array<number> | null = 0;

  afterUpdate(() => {
    localRewards = rewards.toNull();
  });
</script>

<!-- <div class="farm-row-mini" in:slide|local={{ duration: 500 }}> -->
<div
  class="farm-row-mini"
  in:fly={{ x: -200, duration: 500, delay: pos * 100 }}
>
  <div>
    {#if invData.platform === "youves" && invData.type === "long-term"}
      <div class="ribbon">
        <span class="material-icons-outlined"> lock_clock </span>
      </div>
    {:else if invData.platform === "quipuswap" && !invData.info.includes("no-lock")}
      <div class="ribbon">
        <span class="material-icons-outlined"> lock_clock </span>
      </div>
    {:else if invData.platform === "paul" && [AvailableInvestment["PAUL-kUSD-uUSD"], AvailableInvestment["wUSDC-PAUL"], AvailableInvestment["wWETH-PAUL"], AvailableInvestment["PAUL-uUSD"], AvailableInvestment["PAUL-YOU"]].includes(invData.id)}
      <div class="ribbon" style="font-size:0.6rem">withdraw fee</div>
    {:else if invData.platform === "youves" && invData.type === "saving"}
      <div class="ribbon">
        <span class="material-icons-outlined"> savings </span>
      </div>
    {/if}
  </div>
  <div class="icons">
    {#each invData.icons as icon}
      <img src={`tokens/${icon}.png`} alt="farm-token-icon" />
    {/each}
  </div>
  <div class="user-info">
    <div>
      <div class="bold" class:blurry-text={$store.blurryBalances}>
        {formatTokenAmount(stake)}
        {#if invData.alias === "YOU staking" || invData.id === AvailableInvestment["YOUVES-YOU-STAKING"]}
          {AvailableToken.YOU}
        {:else if invData.platform === "youves" && invData.type === "saving"}
          {invData.icons[0]}
        {:else if invData.platform === "kdao" && invData.id === AvailableInvestment["KUSD-KDAO"]}
          kUSD
        {:else}
          LPT
        {/if}
      </div>
    </div>
    <div class:blurry-text={$store.blurryBalances}>
      {formatTokenAmount(stakeInXtz)} ꜩ
    </div>
    <div class:blurry-text={$store.blurryBalances}>
      {formatTokenAmount(stakeInXtz * $store.xtzExchangeRate, 2)} USD
    </div>
  </div>
  <div>
    <div>Rewards</div>
    {#if !Array.isArray(localRewards) && !isNaN(localRewards)}
      <div class="bold" class:blurry-text={$store.blurryBalances}>
        <img
          src={`tokens/${invData.rewardToken}.png`}
          alt="reward-token"
          class="reward-token"
        />
        <span>
          {invData.rewardToken === AvailableToken.uBTC
            ? formatTokenAmount(localRewards, 8)
            : formatTokenAmount(localRewards)}
        </span>
      </div>
      <div style="font-size: 0.8rem" class:blurry-text={$store.blurryBalances}>
        ({formatTokenAmount(
          localRewards * $store.tokens[invData.rewardToken].getExchangeRate(),
          2
        )}
        ꜩ / {formatTokenAmount(
          localRewards *
            $store.tokens[invData.rewardToken].getExchangeRate() *
            $store.xtzExchangeRate,
          2
        )} USD)
      </div>
    {:else if Array.isArray(localRewards) && invData.id === AvailableInvestment["PLENTY-CTEZ-TEZ-LP"]}
      <div class="bold" class:blurry-text={$store.blurryBalances}>
        <p>
          <img
            src={`tokens/PLENTY.png`}
            alt="reward-token"
            class="reward-token"
          />
          <span>
            {formatTokenAmount(localRewards[0])}
          </span>
        </p>
        <p>
          <img src={`tokens/XTZ.png`} alt="reward-token" class="reward-token" />
          <span>
            {formatTokenAmount(localRewards[1])}
          </span>
        </p>
        <div
          style="font-size: 0.8rem"
          class:blurry-text={$store.blurryBalances}
        >
          ({formatTokenAmount(
            [
              localRewards[0] * $store.tokens.PLENTY.getExchangeRate(),
              localRewards[1]
            ].reduce((a, b) => a + b),
            2
          )}
          ꜩ / {formatTokenAmount(
            [
              localRewards[0] * $store.tokens.PLENTY.getExchangeRate(),
              localRewards[1]
            ].reduce((a, b) => a + b) * $store.xtzExchangeRate,
            2
          )} USD)
        </div>
      </div>
    {:else}
      <div>No reward</div>
    {/if}
  </div>
  <div class="buttons">
    <button class="primary" on:click={() => dispatch("harvest")}>
      {#if harvesting}
        <span class="material-icons-outlined loading"> hourglass_empty </span>
        Harvesting
      {:else}
        <span class="material-icons-outlined"> agriculture </span>
        Harvest
      {/if}
    </button>
    <button class="primary" on:click={() => dispatch("modal-action", true)}>
      <span class="material-symbols-outlined"> more_horiz </span>
      More
    </button>
  </div>
  <div>
    <button
      class="transparent expand"
      style="float:right"
      on:click={() => dispatch("expand")}
    >
      <span class="material-icons-outlined" style="margin:0px">
        expand_more
      </span>
    </button>
  </div>
</div>
