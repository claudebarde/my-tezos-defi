<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import BigNumber from "bignumber.js";
  import type { AvailableInvestment, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import config from "../../../config";
  import FarmMiniRow from "../FarmMiniRow.svelte";
  import {
    prepareOperation,
    formatTokenAmount,
    calculateLqtOutput
  } from "../../../utils";

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
    if (invData.icons.includes("XTZ")) {
      const contract = await $store.Tezos.wallet.at(
        "KT1X3zxdTzPB9DgVzA3ad6dgZe9JEamoaeRy"
      );
      const storage: any = await contract.storage();
      const { tez_pool, token_pool, total_supply } = storage.storage;
      // XTZ-QUIPU LP token
      const output = calculateLqtOutput({
        lqTokens: invData.balance,
        xtzPool: tez_pool.toNumber(),
        tokenPool: token_pool.toNumber(),
        lqtTotal: total_supply.toNumber(),
        tokenDecimal: invData.decimals
      });
      if (output && !isNaN(output.xtz) && !isNaN(output.tokens)) {
        stakeInXtz =
          output.xtz + output.tokens * $store.tokens.QUIPU.getExchangeRate();
      }
    } else {
      // QUIPU LP token
      stakeInXtz = invData.balance * $store.tokens.QUIPU.getExchangeRate();
    }
  };

  const calcRewards = async () => {
    // converts rewards into XTZ
    dispatch("farm-update", {
      id: invData.id,
      balance: invData.balance,
      value: stakeInXtz,
      rewards: rewards * $store.tokens.kDAO.getExchangeRate()
    });
  };

  const harvest = async () => {
    harvesting = true;
    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.claim([["unit"]])],
        amount: rewards,
        tokenSymbol: AvailableToken.kDAO
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
          text: `Successfully harvested ${rewardsToHarvest} kDAO!`,
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
              1 {token} = {formatTokenAmount(
                $store.tokens[token].getExchangeRate()
              )}
              ꜩ
            </div>
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
          <div class="bold">
            {formatTokenAmount(rewards)}
            {invData.rewardToken}
          </div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(
              rewards * $store.tokens.kDAO.getExchangeRate(),
              2
            )} ꜩ /
            {formatTokenAmount(
              rewards *
                $store.tokens.kDAO.getExchangeRate() *
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
      stake={invData.balance / 10 ** invData.decimals}
      {stakeInXtz}
      {rewards}
      rewardToken={invData.rewardToken}
      on:expand={() => (expand = true)}
      on:harvest={harvest}
    />
  {/if}
{:else}
  <div>No data found for this farm</div>
{/if}
