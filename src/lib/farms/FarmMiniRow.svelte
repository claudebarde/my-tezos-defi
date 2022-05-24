<script lang="ts">
  import { afterUpdate, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
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
    rewards: Option<number>,
    harvesting: boolean;

  const dispatch = createEventDispatcher();
  let localRewards: number | null = 0;

  afterUpdate(() => {
    localRewards = rewards.toNull();
  });
</script>

<div class="farm-row-mini" in:slide|local={{ duration: 500 }}>
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
      <div class="bold">
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
    <div>{formatTokenAmount(stakeInXtz)} ꜩ</div>
    <div>
      {formatTokenAmount(stakeInXtz * $store.xtzExchangeRate, 2)} USD
    </div>
  </div>
  <div>
    <div>Rewards</div>
    {#if invData.platform === "smartlink"}
      <div>Coming soon!</div>
    {:else if !isNaN(localRewards)}
      <div class="bold">
        {invData.rewardToken === AvailableToken.uBTC
          ? formatTokenAmount(localRewards, 8)
          : formatTokenAmount(localRewards)}
        {invData.rewardToken}
      </div>
      <div style="font-size: 0.8rem">
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
