<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import { Option } from "@swan-io/boxed";
  import moment from "moment";
  import type BigNumber from "bignumber.js";
  import type { InvestmentData } from "../../types";
  import { AvailableToken, AvailableInvestment } from "../../types";
  import store from "../../store";
  import { formatTokenAmount, prepareOperation } from "../../utils";
  import { calcKdaoRewards, calcKdaoStake } from "../../tokenUtils/kdaoUtils";
  import {
    calcPlentyRewards,
    calcPlentyStake,
    fetchPlentyStatistics,
    getExpectedPlenty
  } from "../../tokenUtils/plentyUtils";
  import {
    calcQuipuRewards,
    calcQuipuStake
  } from "../../tokenUtils/quipuUtils";
  import {
    calcYouvesRewards,
    calcYouvesStake
  } from "../../tokenUtils/youvesUtils";
  import { calcMatterStake } from "../../tokenUtils/spicyUtils";
  import FarmMiniRow from "./FarmMiniRow.svelte";
  import Loader from "./Loader.svelte";
  import Modal from "../modal/Modal.svelte";

  export let invName: AvailableInvestment,
    farmsWorker: Worker = undefined,
    pos: number;

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
  let showModal = false;
  let plentyCtezXtzRewards = Option.None<Array<number>>();
  let longTermRewardsEndPeriod = "";

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
      case "plenty":
        if (invData.id === AvailableInvestment["xPLENTY-Staking"]) {
          const plentyAmount = await getExpectedPlenty(
            $store.Tezos,
            invData.balance,
            $store.currentLevel
          );
          if (plentyAmount) {
            stakeInXtz =
              (plentyAmount / 10 ** $store.tokens.PLENTY.decimals) *
              $store.tokens.PLENTY.getExchangeRate();
          } else {
            stakeInXtz = 0;
          }
        } else {
          const plentyStake = await calcPlentyStake(invData);
          plentyStake.match({
            Ok: val => {
              stakeInXtz = val;
              return;
            },
            Error: err => console.error(err)
          });
          // TODO: calculate APR and APY
          /*if (stakeInXtz) {
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
            }*/
        }
        break;
      case "quipuswap":
        const quipuStake = await calcQuipuStake(invData, $store.Tezos);
        quipuStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err, "zzz")
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
      /*case "paul":
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
        break;*/
      /*case "smartlink":
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
        break;*/
      /*case "matter":
        const matterStake = await calcMatterStake(
          [$store.tokens.uUSD, $store.tokens.WTZ],
          $store.Tezos
        );
        matterStake.match({
          Ok: val => {
            stakeInXtz = val;
            return;
          },
          Error: err => console.error(err)
        });
        break;*/
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
      /*case "paul":
        rewards = await calcPaulRewards(invData);
        break;*/
      case "plenty":
        if (invData.id === "xPLENTY-Staking") {
          rewards = Option.None();
        } else {
          const plentyRes = await calcPlentyRewards(
            invData,
            $store.userAddress,
            $store.currentLevel
          );
          plentyRes.match({
            None: () => {
              rewards = Option.None();
              return;
            },
            Some: val => {
              if (val.length === 1) {
                rewards = Option.Some(val[0]);
              } else {
                plentyCtezXtzRewards = Option.Some(val);
              }
              return;
            }
          });
        }
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
      /*case "smartlink":
        rewards = await calcSmartlinkRewards();
        break;
      case "wrap":
        rewards = await calcWrapRewards(invData, $store.userAddress);
        break;*/
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
        // if long term farm, get end period
        if (invData.type === "long-term") {
          const contract = await $store.Tezos.wallet.at(invData.address);
          const storage: any = await contract.storage();
          const stake = await (async (): Promise<
            Option<Array<{ age_timestamp: string; stake: BigNumber }>>
          > => {
            if (invData.icons.length === 1) {
              const stakeSet = await storage.stakes_owner_lookup.get(
                $store.userAddress
              );
              if (stakeSet && stakeSet.length > 0) {
                const stakes = await Promise.all(
                  stakeSet.map(
                    async stakeId => await storage.stakes.get(stakeId)
                  )
                );
                if (stakes && stakes.length > 0) {
                  return Option.Some([
                    ...stakes.map(stake => ({
                      age_timestamp: stake.age_timestamp,
                      stake: stake.stake
                    }))
                  ]);
                } else {
                  return Option.None();
                }
              } else {
                return Option.None();
              }
            } else if (invData.icons.length === 2) {
              const stake = await storage.stakes.get($store.userAddress);
              if (stake) {
                return Option.Some([stake]);
              } else {
                return Option.None();
              }
            }
          })();
          stake.match({
            None: () => undefined,
            Some: stake => {
              // TODO: handles cases when there are multiple stakes
              if (stake.length === 1) {
                const end =
                  new Date(stake[0].age_timestamp).getTime() +
                  storage.max_release_period * 1000;
                longTermRewardsEndPeriod = moment(end).format(
                  "MMM Do, YYYY - h:mm a"
                );
              }
            }
          });
        }
        break;
    }
    // converts rewards into XTZ
    rewards.match({
      None: () => undefined, //console.log(`No rewards available for ${invData.alias}`),
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
    if (!invData || !invData.balance) {
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
          <div class="bold" class:blurry-text={$store.blurryBalances}>
            {#if invData.platform === "plenty" && invData.id !== "PLENTY-CTEZ-TEZ-LP"}
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
          <div class="bold" class:blurry-text={$store.blurryBalances}>
            {formatTokenAmount(stakeInXtz)} ꜩ
          </div>
        </div>
        <div>
          <div>Value in USD</div>
          <div class="bold" class:blurry-text={$store.blurryBalances}>
            {formatTokenAmount(stakeInXtz * $store.xtzExchangeRate, 2)} USD
          </div>
        </div>
      </div>
      <div class="actions">
        <div>
          {#if rewards.isNone()}
            <div>No rewards available</div>
          {:else}
            <div>Rewards</div>
            <div class="bold" class:blurry-text={$store.blurryBalances}>
              {invData.rewardToken === AvailableToken.uBTC
                ? formatTokenAmount(rewards.getWithDefault(0), 8)
                : formatTokenAmount(rewards.getWithDefault(0))}
              {invData.rewardToken}
            </div>
            <div
              style="font-size: 0.8rem"
              class:blurry-text={$store.blurryBalances}
            >
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
              <div style="font-size: 0.8rem;font-style: italic">
                {longTermRewardsEndPeriod}
              </div>
              <div class="bold" class:blurry-text={$store.blurryBalances}>
                {formatTokenAmount(youvesLongTermFullRewards)}
                {invData.rewardToken}
              </div>
              <div
                style="font-size: 0.8rem"
                class:blurry-text={$store.blurryBalances}
              >
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
        stake={invData.platform === "plenty" &&
        invData.id !== "PLENTY-CTEZ-TEZ-LP"
          ? invData.balance / 10 ** 18
          : invData.balance / 10 ** invData.decimals}
        {stakeInXtz}
        rewards={invData.id === AvailableInvestment["PLENTY-CTEZ-TEZ-LP"]
          ? plentyCtezXtzRewards
          : rewards}
        {harvesting}
        {pos}
        on:expand={() => (expand = true)}
        on:harvest={harvest}
        on:modal-action={event => (showModal = event.detail)}
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
{#if showModal}
  <Modal
    type="farm"
    platform={invData.platform}
    action={undefined}
    payload={{
      farmAddress: invData.address,
      farmId: invData.id,
      farmAlias: invData.alias
    }}
    on:close={() => (showModal = false)}
  />
{/if}
