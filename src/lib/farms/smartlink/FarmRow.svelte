<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import { Option } from "@swan-io/boxed";
  import type { AvailableInvestment, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import {
    formatTokenAmount,
    prepareOperation,
    calculateLqtOutput
  } from "../../../utils";
  import FarmMiniRow from "../FarmMiniRow.svelte";
  import config from "../../../config";
  import Loader from "$lib/farms/Loader.svelte";

  export let invName: AvailableInvestment;

  const dispatch = createEventDispatcher();
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let rewards = Option.None<number>();
  let recalcInterval;
  let expand = false;
  let harvesting = false;
  let harvestingSuccess = false;

  const calcStake = async () => {
    // finds LP token total supply
    const contract = await $store.Tezos.wallet.at(invData.address);
    const storage: any = await contract.storage();
    const { input_token_address } = storage;
    const lptContract = await $store.Tezos.wallet.at(input_token_address);
    const lptStorage: any = await lptContract.storage();
    const { total_supply } = lptStorage;
    // finds DEX address
    const dexAddress =
      config.vortexDexAddresses[`${invData.icons[0]}-${invData.icons[1]}`];
    if (total_supply && dexAddress) {
      const dexContract = await $store.Tezos.wallet.at(dexAddress);
      const dexStorage: any = await dexContract.storage();
      const { xtzPool, tokenPool } = dexStorage;

      const result = calculateLqtOutput({
        lqTokens: invData.balance,
        xtzPool,
        tokenPool,
        lqtTotal: total_supply.toNumber(),
        tokenDecimal: $store.tokens[invData.icons[1]].decimals
      });
      if (result && !isNaN(result.xtz) && !isNaN(result.tokens)) {
        // TODO: use exchange rate from TezTools when it becomes available
        /*stakeInXtz =
          result.xtz +
          result.tokens * $store.tokens[invData.icons[1]].exchangeRate;*/
        stakeInXtz = result.xtz * 2;
      }
      // converts rewards into XTZ
      dispatch("farm-update", {
        id: invData.id,
        balance: invData.balance,
        value: stakeInXtz,
        rewards: rewards.match({
          None: () => 0,
          Some: rw => rw * $store.tokens.ANTI.getExchangeRate()
        })
      });
    }
  };

  const calcRewards = async () => {
    rewards = Option.Some(0);
    /*if (rewardsRes.status) {
      rewards = +rewardsRes.totalRewards;
      // converts rewards into XTZ
      dispatch("farm-update", {
        id: invData.id,
        balance: invData.balance,
        value: stakeInXtz,
        rewards: rewards * $store.tokens.PLENTY.exchangeRate
      });
    }*/
  };

  const harvest = async () => {
    harvesting = true;
    try {
      if (rewards.isNone()) throw "No rewards to harvest";

      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.GetReward([["unit"]])],
        amount: rewards.getWithDefault(0),
        tokenSymbol: AvailableToken.PLENTY
      });
      const op = await batch.send();
      await op.confirmation();
      harvesting = false;
      const opStatus = await op.status();
      if (opStatus === "applied") {
        harvestingSuccess = true;
        rewards = Option.Some(0);
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
          <div>Coming soon!</div>
          <!-- <div class="bold">
            {formatTokenAmount(rewards)}
            {invData.rewardToken}
          </div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(
              rewards * $store.tokens[invData.rewardToken].getExchangeRate(),
              2
            )}
            ꜩ / {formatTokenAmount(
              rewards *
                $store.tokens[invData.rewardToken].getExchangeRate() *
                $store.xtzExchangeRate,
              2
            )} USD)
          </div> -->
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
    <!-- Loader-->
    {#if stakeInXtz && rewards}
      <FarmMiniRow
        {invData}
        stake={invData.balance / 10 ** invData.decimals}
        {stakeInXtz}
        {rewards}
        rewardToken={invData.rewardToken}
        on:expand={() => (expand = true)}
        on:harvest={harvest}
      />
    {:else}
      <Loader
        icons={invData.icons}
        stake={invData.balance / 10 ** invData.decimals}
      />
    {/if}
  {/if}
{:else}
  <div>No data found for this farm</div>
{/if}
