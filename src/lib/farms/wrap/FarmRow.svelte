<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import type { AvailableInvestment, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import {
    calcTokenStakesInWrapFarms,
    getWrapReward
  } from "../../../tokenUtils/wrapUtils";
  import FarmMiniRow from "../FarmMiniRow.svelte";

  export let invName: AvailableInvestment;

  const dispatch = createEventDispatcher();
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let rewards = 0;
  let recalcInterval;
  let expand = false;

  const calcStake = async () => {
    if (invData.type === "fee-farming") {
      stakeInXtz =
        +(
          (invData.balance / 10 ** invData.decimals) *
          $store.tokens.WRAP.exchangeRate
        ).toFixed(5) / 1;
    } else if (invData.type === "staking") {
      const stakes = await calcTokenStakesInWrapFarms({
        invData,
        balance: invData.balance,
        tokenExchangeRate: $store.tokens[invData.rewardToken].exchangeRate,
        tokenDecimals: $store.tokens[invData.rewardToken].decimals,
        Tezos: $store.Tezos
      });

      if (stakes) {
        stakeInXtz = +stakes.toFixed(5) / 1;
      } else {
        stakeInXtz = null;
      }
    } else {
      stakeInXtz =
        +(
          (invData.balance / 10 ** invData.decimals) *
          $store.tokens.WRAP.exchangeRate
        ).toFixed(5) / 1;
    }
  };

  const calcRewards = async () => {
    const rewardsRes = await getWrapReward(
      invData.id,
      invData.address,
      $store.userAddress,
      invData.balance
    );
    if (rewardsRes) {
      rewards = rewardsRes.toNumber() / 10 ** $store.tokens.WRAP.decimals;
      // converts rewards into XTZ
      dispatch("farm-update", {
        id: invData.id,
        balance: invData.balance,
        value: stakeInXtz,
        rewards: rewards * $store.tokens.WRAP.exchangeRate
      });
    }
  };

  onMount(async () => {
    invData = $store.investments[invName];
    if (!invData.balance) {
      stakeInXtz = 0;
    } else {
      await calcStake();
      await calcRewards();
      recalcInterval = setInterval(async () => {
        await calcStake();
        await calcRewards();
      }, 60_000);
    }
  });

  onDestroy(() => {
    clearInterval(recalcInterval);
  });
</script>

{#if invData && $store.tokens}
  {#if expand}
    <div class="farm-row" in:slide|local={{ duration: 500 }}>
      <div class="farm-info">
        <div class="icons">
          {#each invData.icons as icon}
            <img src={`tokens/${icon}.png`} alt="farm-token-icon" />
          {/each}
        </div>
        <div class="farm-info__link">
          <a
            href={`https://better-call.dev/mainnet/${invData.address}/operations`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {invData.alias}
          </a>
        </div>
        <div class="farm-info__tokens-price">
          {#each invData.icons as token}
            {#if token !== "XTZ"}
              <div>
                1 {token} = {formatTokenAmount(
                  $store.tokens[token].exchangeRate
                )}
                ꜩ
              </div>
            {/if}
          {/each}
        </div>
      </div>
      <div class="user-info">
        <div>
          <div>Stake</div>
          <div class="bold">
            {formatTokenAmount(invData.balance / 10 ** invData.decimals)} LPT
          </div>
        </div>
        <div>
          <div>Value in XTZ</div>
          <div class="bold">{formatTokenAmount(stakeInXtz)} ꜩ</div>
        </div>
        <div>
          <div>Value in USD</div>
          <div class="bold">
            {formatTokenAmount(stakeInXtz * $store.xtzExchangeRate, 2)} USD
          </div>
        </div>
      </div>
      <div class="actions">
        <div>
          <div>Rewards</div>
          <div class="bold">{formatTokenAmount(rewards)} WRAP</div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(rewards * $store.tokens.WRAP.exchangeRate, 2)} ꜩ
            /
            {formatTokenAmount(
              rewards *
                $store.tokens.WRAP.exchangeRate *
                $store.xtzExchangeRate,
              2
            )} USD)
          </div>
        </div>
        <div>
          <div />
          <button class="primary">
            <span class="material-icons-outlined"> agriculture </span>
            Harvest
          </button>
        </div>
      </div>
      <div class="token-box_expand-less">
        <button class="transparent" on:click={() => (expand = !expand)}>
          <span class="material-icons-outlined" style="margin:0px">
            expand_less
          </span>
        </button>
      </div>
    </div>
  {:else}
    <FarmMiniRow
      {invData}
      stake={invData.balance / 10 ** invData.decimals}
      {stakeInXtz}
      {rewards}
      rewardToken={invData.rewardToken}
      on:expand={() => (expand = true)}
    />
  {/if}
{:else}
  <div>No data found for the {invData ? invData.alias : ""} farm</div>
{/if}
