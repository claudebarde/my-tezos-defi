<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import { Option } from "@swan-io/boxed";
  import type { AvailableInvestment, InvestmentData } from "../../types";
  import { AvailableToken } from "../../types";
  import store from "../../store";
  import { formatTokenAmount, prepareOperation } from "../../utils";
  import { calcKdaoRewards, calcKdaoStake } from "../../tokenUtils/kdaoUtils";
  import {
    calcPaulRewards,
    calcPaulStake,
    calcPaulFarmApr
  } from "../../tokenUtils/paulUtils";
  import {
    calcPlentyRewards,
    calcPlentyStake,
    fetchPlentyStatistics
  } from "../../tokenUtils/plentyUtils";
  import {
    calcQuipuRewards,
    calcQuipuStake
  } from "../../tokenUtils/quipuUtils";
  import {
    calcSmartlinkRewards,
    calcSmartlinkStake
  } from "../../tokenUtils/smartlinkUtils";
  import { calcWrapRewards, calcWrapStake } from "../../tokenUtils/wrapUtils";
  import {
    calcYouvesRewards,
    calcYouvesStake
  } from "../../tokenUtils/youvesUtils";
  import FarmMiniRow from "./FarmMiniRow.svelte";
  import Loader from "$lib/farms/Loader.svelte";

  export let invName: AvailableInvestment,
    farmsWorker: Worker = undefined;

  const dispatch = createEventDispatcher();
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let rewards = Option.None<number>();
  let recalcInterval;
  let expand = false;
  let harvesting = false;
  let harvestingSuccess = false;
  let apr: number, apy: number;
  let youvesLongTermFullRewards: number;

  const handleFarmsWorker = () => {
    console.log("worker for", invData.id);
  };

  const calcStake = async () => {
    switch (invData.platform) {
      case "kdao":
        const kdaoStake = await calcKdaoStake(invData, $store.Tezos);
        kdaoStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        // TODO: calculate ROI per week
        break;
      case "paul":
        const paulStake = await calcPaulStake(invData, $store.Tezos);
        paulStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        if (stakeInXtz) {
          const aprRes = await calcPaulFarmApr({
            Tezos: $store.Tezos,
            farmId: invData.id,
            farmAddress: invData.address,
            earnCoinPrice: $store.tokens.PAUL.getExchangeRate(),
            tokenDecimals: $store.tokens.PAUL.decimals,
            paulPrice: $store.tokens.PAUL.getExchangeRate()
          });
          aprRes.match({
            Ok: _apr => {
              apr = _apr;
              // calculates estimated ROI per week
              const roiPerWeek = formatTokenAmount(
                (stakeInXtz * _apr) / 100 / 52,
                2
              );
              dispatch("roi-per-week", {
                id: invData.id,
                roi: roiPerWeek
              });
            },
            Error: err => console.error(err)
          });
        }
        break;
      case "plenty":
        const plentyStake = await calcPlentyStake(invData);
        plentyStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        if (stakeInXtz) {
          const statsRes = await fetchPlentyStatistics(invData, stakeInXtz);
          statsRes.match({
            Ok: stats => {
              apr = stats.apr;
              apy = stats.apy;
              dispatch("roi-per-week", {
                id: invData.id,
                roi: stats.roiPerWeek
              });
            },
            Error: err => console.error(err)
          });
        }
        break;
      case "quipuswap":
        const quipuStake = await calcQuipuStake(invData, $store.Tezos);
        quipuStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        break;
      case "smartlink":
        const smartlinkStake = await calcSmartlinkStake($store.Tezos, invData);
        smartlinkStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        break;
      case "wrap":
        const wrapStake = await calcWrapStake(invData, $store.Tezos);
        wrapStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        break;
      case "youves":
        const youvesStake = await calcYouvesStake(
          invData,
          $store.Tezos,
          $store.userAddress
        );
        youvesStake.match({
          Ok: val => {
            stakeInXtz = val.stakeInXtz;
            return;
          },
          Error: err => console.error(err)
        });
        break;
    }
  };

  const calcRewards = async () => {
    switch (invData.platform) {
      case "kdao":
        rewards = await calcKdaoRewards(
          invData,
          $store.userAddress,
          $store.currentLevel
        );
        break;
      case "paul":
        rewards = await calcPaulRewards(invData);
        break;
      case "plenty":
        rewards = await calcPlentyRewards(
          invData,
          $store.userAddress,
          $store.currentLevel
        );
        break;
      case "quipuswap":
        const farmId = +invData.id.replace("QUIPU-FARM-", "");
        rewards = await calcQuipuRewards(
          $store.Tezos,
          invData,
          farmId,
          $store.userAddress
        );
        break;
      case "smartlink":
        rewards = await calcSmartlinkRewards();
        break;
      case "wrap":
        rewards = await calcWrapRewards(invData, $store.userAddress);
        break;
      case "youves":
        const rewardsRes = await calcYouvesRewards(
          $store.Tezos,
          invData,
          $store.userAddress
        );
        rewards = rewardsRes.match({
          None: () => Option.None(),
          Some: rw => {
            if (invData.type === "long-term") {
              youvesLongTermFullRewards = rw.longTermRewards;
            }
            return Option.Some(rw.availableRewards);
          }
        });
        break;
    }
    // converts rewards into XTZ
    rewards.match({
      None: () => console.log(`No rewards available for ${invData.alias}`),
      Some: rw => {
        dispatch("farm-update", {
          id: invData.id,
          balance: invData.balance,
          value: stakeInXtz,
          rewards: rw * $store.tokens[invData.rewardToken].getExchangeRate()
        });
      }
    });
  };

  const harvest = async () => {
    // TODO: display a toast when rewards are zero
    if (rewards.isNone()) return;

    harvesting = true;
    try {
      const rewardsToHarvest = rewards.match({
        None: () => 0,
        Some: rw => rw
      });
      if (rewardsToHarvest === 0) throw "No rewards to harvest";

      const contract = await $store.Tezos.wallet.at(invData.address);
      const op = await (async () => {
        switch (invData.platform) {
          case "kdao":
            const kdaoBatch = prepareOperation({
              contractCalls: [contract.methods.claim([["unit"]])],
              amount: rewards.getWithDefault(0),
              tokenSymbol: AvailableToken.kDAO
            });
            return await kdaoBatch.send();
          case "plenty":
            const plentyBatch = prepareOperation({
              contractCalls: [contract.methods.GetReward([["unit"]])],
              amount: rewards.getWithDefault(0),
              tokenSymbol: AvailableToken.PLENTY
            });
            return await plentyBatch.send();
          case "paul":
            const paulBatch = prepareOperation({
              contractCalls: [
                invData.id === "PAUL-PAUL"
                  ? contract.methods.earn($store.userAddress, false)
                  : contract.methods.earn($store.userAddress)
              ],
              amount: rewards.getWithDefault(0),
              tokenSymbol: AvailableToken.PAUL
            });
            return await paulBatch.send();
          case "youves":
            const youvesBatch = prepareOperation({
              contractCalls: [contract.methods.claim([["unit"]])],
              amount: rewards.getWithDefault(0),
              tokenSymbol: invData.rewardToken
            });
            return await youvesBatch.send();
        }
      })();
      await op.confirmation();
      harvesting = false;
      const opStatus = await op.status();
      if (opStatus === "applied") {
        harvestingSuccess = true;
        rewards = Option.Some(0);
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
      // if (farmsWorker) {
      //   farmsWorker.onmessage = handleFarmsWorker;
      //   farmsWorker.postMessage({
      //     type: "calc-stake",
      //     payload: { invData, userAddress: $store.userAddress }
      //   });
      // } else {
      // }
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
            {#if token === "XTZ"}
              <div>
                1 {token} = {formatTokenAmount($store.xtzExchangeRate, 2)}
                USD
              </div>
            {:else}
              <div>
                1 {token} = {formatTokenAmount(
                  $store.tokens[token].getExchangeRate()
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
            {#if invData.platform === "plenty"}
              {formatTokenAmount(invData.balance / 10 ** 18)} LPT
            {:else}
              {formatTokenAmount(invData.balance / 10 ** invData.decimals)}
              {#if invData.alias === "YOU staking"}
                {AvailableToken.YOU}
              {:else}
                LPT
              {/if}
            {/if}
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
          {#if rewards.isNone()}
            <div>No rewards available</div>
          {:else if invData.platform !== "smartlink"}
            <div>Rewards</div>
            <div class="bold">
              {invData.rewardToken === AvailableToken.uBTC
                ? formatTokenAmount(rewards.getWithDefault(0), 8)
                : formatTokenAmount(rewards.getWithDefault(0))}
              {invData.rewardToken}
            </div>
            <div style="font-size: 0.8rem">
              ({formatTokenAmount(
                rewards.getWithDefault(0) *
                  $store.tokens[invData.rewardToken].getExchangeRate(),
                2
              )} ꜩ /
              {formatTokenAmount(
                rewards.getWithDefault(0) *
                  $store.tokens[invData.rewardToken].getExchangeRate() *
                  $store.xtzExchangeRate,
                2
              )} USD)
            </div>
            {#if invData.platform === "youves" && invData.type === "long-term"}
              <div style="margin-top:15px">Full rewards</div>
              <div class="bold">
                {formatTokenAmount(youvesLongTermFullRewards)}
                {invData.rewardToken}
              </div>
              <div style="font-size: 0.8rem">
                ({formatTokenAmount(
                  youvesLongTermFullRewards *
                    $store.tokens[invData.rewardToken].getExchangeRate(),
                  2
                )} ꜩ /
                {formatTokenAmount(
                  youvesLongTermFullRewards *
                    $store.tokens[invData.rewardToken].getExchangeRate() *
                    $store.xtzExchangeRate,
                  2
                )} USD)
              </div>
            {/if}
          {:else}
            <div>Coming soon!</div>
          {/if}
        </div>
        <div>
          <div />
          <button class="primary" on:click={harvest}>
            <span class="material-icons-outlined"> agriculture </span>
            {#if harvesting}
              Harvesting
            {:else}
              Harvest
            {/if}
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
    {#if !isNaN(stakeInXtz)}
      <FarmMiniRow
        {invData}
        stake={invData.platform === "plenty"
          ? invData.balance / 10 ** 18
          : invData.balance / 10 ** invData.decimals}
        {stakeInXtz}
        {rewards}
        {harvesting}
        on:expand={() => (expand = true)}
        on:harvest={harvest}
      />
    {:else}
      <Loader
        icons={invData.icons}
        stake={invData.platform === "plenty"
          ? invData.balance / 10 ** 18
          : invData.balance / 10 ** invData.decimals}
      />
    {/if}
  {/if}
{:else}
  <div>No data found for this farm</div>
{/if}
