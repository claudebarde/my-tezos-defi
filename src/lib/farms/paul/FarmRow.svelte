<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import type { AvailableInvestment, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount, prepareOperation } from "../../../utils";
  import {
    calcTokenStakesFromQuipu,
    calcTokenStakesInAlienFarm,
    getPaulReward
  } from "../../../tokenUtils/paulUtils";
  import FarmMiniRow from "../FarmMiniRow.svelte";
  import Loader from "$lib/farms/Loader.svelte";

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
    if (invData.id === "PAUL-XTZ" || invData.id === "MAG-XTZ") {
      stakeInXtz = await calcTokenStakesFromQuipu({
        Tezos: $store.Tezos,
        id: invData.id,
        balance: invData.balance,
        paulToken: {
          decimals: $store.tokens.PAUL.decimals,
          exchangeRate: $store.tokens.PAUL.getExchangeRate()
        }
      });
    } else if (invData.id === "PAUL-PAUL") {
      stakeInXtz = formatTokenAmount(
        (invData.balance / 10 ** invData.decimals) *
          $store.tokens.PAUL.getExchangeRate()
      );
    } else {
      stakeInXtz = null;
    }

    if (invData.info?.includes("paul-lqt")) {
      const shares = await calcTokenStakesInAlienFarm({
        Tezos: $store.Tezos,
        amountOfTokens: invData.balance,
        tokens: invData.icons.map(icon => {
          const {
            address,
            tokenId = 0,
            type
          } = $store.tokens[icon as AvailableToken];
          return {
            address,
            tokenId,
            tokenType: type
          };
        })
      });
      if (shares) {
        const token1InXtz =
          ((shares.tokenAAmount /
            10 ** $store.tokens[invData.icons[0]].decimals) *
            $store.tokens[invData.icons[0]].getExchangeRate()) /
          10 ** 6;
        const token2InXtz =
          ((shares.tokenBAmount /
            10 ** $store.tokens[invData.icons[1]].decimals) *
            $store.tokens[invData.icons[1]].getExchangeRate()) /
          10 ** 6;
        stakeInXtz = formatTokenAmount(token1InXtz + token2InXtz);
      }
    }
  };

  const calcRewards = async () => {
    const rewardsRes = await getPaulReward(invData.address);
    if (rewardsRes) {
      rewards = rewardsRes.toNumber() / 10 ** $store.tokens.PAUL.decimals;
      // converts rewards into XTZ
      dispatch("farm-update", {
        id: invData.id,
        balance: invData.balance,
        value: stakeInXtz,
        rewards: rewards * $store.tokens.PAUL.getExchangeRate()
      });
    }
  };

  const harvest = async () => {
    harvesting = true;
    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [
          invData.id === "PAUL-PAUL"
            ? contract.methods.earn($store.userAddress, false)
            : contract.methods.earn($store.userAddress)
        ],
        amount: rewards,
        tokenSymbol: AvailableToken.PAUL
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
          title: "Success",
          text: `Successfully harvested ${rewardsToHarvest} PAUL!`,
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
        text: "Couldn't harvest PAUL tokens",
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
          <div class="bold">{formatTokenAmount(rewards)} PAUL</div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(
              rewards * $store.tokens.PAUL.getExchangeRate(),
              2
            )} ꜩ /
            {formatTokenAmount(
              rewards *
                $store.tokens.PAUL.getExchangeRate() *
                $store.xtzExchangeRate,
              2
            )} USD)
          </div>
        </div>
        <div>
          <div />
          <button class="primary">
            <span class="material-icons-outlined" on:click={harvest}>
              agriculture
            </span>
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
        rewardToken={AvailableToken.PAUL}
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
