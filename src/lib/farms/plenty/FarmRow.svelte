<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import type { AvailableInvestment, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount, prepareOperation } from "../../../utils";
  import {
    calcPlentyStakeInXtz,
    getPlentyReward
  } from "../../../tokenUtils/plentyUtils";
  import FarmMiniRow from "../FarmMiniRow.svelte";

  export let invName: AvailableInvestment;

  const dispatch = createEventDispatcher();
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let rewards = 0;
  let recalcInterval;
  let expand = false;
  let harvesting = false;
  let harvestingSuccess = false;

  const calcStake = async () => {
    stakeInXtz = await calcPlentyStakeInXtz({
      isPlentyLpToken: invData.platform === "plenty",
      id: invData.id,
      balance: invData.balance,
      decimals: invData.decimals,
      exchangeRate: $store.tokens[invData.rewardToken].exchangeRate,
      rewardToken: invData.rewardToken
    });
    // converts rewards into XTZ
    dispatch("farm-update", {
      id: invData.id,
      balance: invData.balance,
      value: stakeInXtz,
      rewards: rewards * $store.tokens.PLENTY.exchangeRate
    });
  };

  const calcRewards = async () => {
    const rewardsRes = await getPlentyReward(
      $store.userAddress,
      invData.address,
      $store.currentLevel,
      invData.rewardToken === AvailableToken.YOU
        ? $store.investments[invData.id].decimals
        : 18
    );
    if (rewardsRes.status) {
      rewards = +rewardsRes.totalRewards;
      // converts rewards into XTZ
      dispatch("farm-update", {
        id: invData.id,
        balance: invData.balance,
        value: stakeInXtz,
        rewards: rewards * $store.tokens.PLENTY.exchangeRate
      });
    }
  };

  const harvest = async () => {
    harvesting = true;
    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.GetReward([["unit"]])],
        amount: rewards,
        tokenSymbol: AvailableToken.PLENTY
      });
      const op = await batch.send();
      await op.confirmation();
      harvesting = false;
      const opStatus = await op.status();
      if (opStatus === "applied") {
        harvestingSuccess = true;
        rewards = 0;
        /*toastStore.addToast({
          type: "success",
          title: "Success!",
          text: `Successfully harvested ${rewardsToHarvest} PLENTY!`,
          dismissable: false,
          icon: "agriculture"
        });*/
        setTimeout(() => {
          harvestingSuccess = undefined;
        }, 2000);
      } else {
        harvestingSuccess = false;
        throw `Error when applying operation: _${opStatus}_`;
      }
    } catch (error) {
      console.log(error);
      /*toastStore.addToast({
        type: "error",
        title: "Harvest error",
        text: "Couldn't harvest PLENTY tokens",
        dismissable: false,
        icon: "agriculture"
      });*/
    } finally {
      harvesting = false;
    }
  };

  onMount(async () => {
    invData = $store.investments[invName];
    if (!invData.balance) {
      stakeInXtz = 0;
    } else {
      await calcRewards();
      await calcStake();
      recalcInterval = setInterval(async () => {
        await calcRewards();
        await calcStake();
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
            <div>
              1 {token} = {formatTokenAmount($store.tokens[token].exchangeRate)}
              ꜩ
            </div>
          {/each}
        </div>
      </div>
      <div class="user-info">
        <div>
          <div>Stake</div>
          <div class="bold">
            {formatTokenAmount(invData.balance / 10 ** 18)} LPT
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
          <div class="bold">{formatTokenAmount(rewards)} PLENTY</div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(rewards * $store.tokens.PLENTY.exchangeRate, 2)}
            ꜩ / {formatTokenAmount(
              rewards *
                $store.tokens.PLENTY.exchangeRate *
                $store.xtzExchangeRate,
              2
            )} USD)
          </div>
        </div>
        <div>
          <div />
          <button class="primary" on:click={harvest}>
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
      stake={invData.balance / 10 ** 18}
      {stakeInXtz}
      {rewards}
      rewardToken={AvailableToken.PLENTY}
      on:expand={() => (expand = true)}
      on:harvest={harvest}
    />
  {/if}
{:else}
  <div>No data found for this farm</div>
{/if}
