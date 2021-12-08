<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import tippy from "tippy.js";
  import type { InvestmentData, AvailableInvestments } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import {
    loadInvestment,
    prepareOperation,
    formatTokenAmount
  } from "../../../utils";
  import toastStore from "../../Toast/toastStore";
  import Modal from "../../Modal/Modal.svelte";
  import { calcTokenStakesInWrapFarms } from "../../../tokenUtils/wrapUtils";
  import config from "../../../config";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments;

  let harvesting = false;
  let harvestingSuccess = undefined;
  let compounding = false;
  let compoundingSuccess = undefined;
  let stakeInXtz: null | number = null;
  let openSettingsModal = false;
  let apy: null | number = null;
  let apr: null | number = null;
  let totalStaked: null | number = null;
  const dispatch = createEventDispatcher();
  let moreOptions = false;
  let roiPerWeek: number | null = null;

  const harvest = async () => {
    harvesting = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.claim([["unit"]])],
        amount: +rewards.amount,
        tokenSymbol: AvailableToken.WRAP
      });
      const op = await batch.send();
      await op.confirmation();
      harvesting = false;
      const opStatus = await op.status();
      if (opStatus === "applied") {
        harvestingSuccess = true;
        dispatch("reset-rewards", invData.id);
        toastStore.addToast({
          type: "success",
          title: "Success!",
          text: `Successfully harvested ${rewardsToHarvest} WRAP!`,
          dismissable: false,
          icon: "agriculture"
        });
        setTimeout(() => {
          harvestingSuccess = undefined;
        }, 2000);
      } else {
        harvestingSuccess = false;
        throw `Error when applying operation: _${opStatus}_`;
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        title: "Harvest error",
        text: "Couldn't harvest WRAP tokens",
        dismissable: false,
        icon: "agriculture"
      });
    } finally {
      harvesting = false;
    }
  };

  const compound = async () => {
    compounding = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const tokensToCompound = Math.floor(
        rewards.amount * 10 ** $store.tokens.WRAP.decimals
      );
      // contract to get the rewards from
      const contract = await $store.Tezos.wallet.at(invData.address);
      // wrap stacking contract for compounding
      const wrapStackingAddress = $store.investments["WRAP-STACKING"].address;
      const wrapStakingContract = await $store.Tezos.wallet.at(
        wrapStackingAddress
      );
      // wrap token contract
      const wrapTokenContract = await $store.Tezos.wallet.at(
        $store.tokens.WRAP.address
      );

      const batch = prepareOperation({
        contractCalls: [
          contract.methods.claim([["unit"]]),
          wrapTokenContract.methods.update_operators([
            {
              add_operator: {
                owner: $store.userAddress,
                operator: wrapStackingAddress,
                token_id: 0
              }
            }
          ]),
          wrapStakingContract.methods.stake(tokensToCompound),
          wrapTokenContract.methods.update_operators([
            {
              remove_operator: {
                owner: $store.userAddress,
                operator: wrapStackingAddress,
                token_id: 0
              }
            }
          ])
        ],
        amount: +rewards.amount,
        tokenSymbol: AvailableToken.WRAP
      });
      const batchOp = await batch.send();
      await batchOp.confirmation();
      const opStatus = await batchOp.status();
      if (opStatus === "applied") {
        compoundingSuccess = true;
        dispatch("reset-rewards", invData.id);
        dispatch("update-stake", {
          id: invData.id,
          balance: +invData.balance + +tokensToCompound
        });
        toastStore.addToast({
          type: "success",
          title: "Success!",
          text: `Successfully harvested and restaked ${rewardsToHarvest} WRAP!`,
          dismissable: false,
          icon: "agriculture"
        });
        setTimeout(() => {
          compoundingSuccess = undefined;
        }, 2000);
      } else {
        compoundingSuccess = false;
        throw `Error when applying operation: _${opStatus}_`;
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        title: "Harvest error",
        text: "Couldn't harvest WRAP tokens",
        dismissable: false,
        icon: "agriculture"
      });
    } finally {
      compounding = false;
    }
  };

  const fetchStatistics = async (type: string, farm: string) => {
    try {
      let url = "";
      switch (type) {
        case "staking":
          url = `https://stats.info.tzwrap.com/v1/liquidity-mining/apy`;
          break;
        case "stacking":
          url = `https://stats.info.tzwrap.com/v1/stacking/apy`;
          break;
        case "fee-farming":
          url = `https://stats.info.tzwrap.com/v1/staking/apy`;
          break;
      }
      if (!url) throw "No URL was generated";

      const statsRes = await fetch(url);
      if (!statsRes) throw "Unable to fetch WRAP statistics";

      const stats = await statsRes.json();
      if (
        type === "stacking" &&
        Array.isArray(stats) &&
        stats.length === 1 &&
        stats[0].asset === "WRAP"
      ) {
        // stacking
        apy = +stats[0].apy;
        apr = +stats[0].apr;
        totalStaked = +stats[0].totalStaked;
      } else if (type === "staking" && Array.isArray(stats)) {
        const token =
          farm === "WRAP-XTZ-FM"
            ? AvailableToken.WRAP
            : $store.investments[farm].rewardToken;
        const farmStats = stats.find(st => st.base === token);
        if (farmStats) {
          apy = +farmStats.apy;
          apr = +farmStats.apr;
          totalStaked = +farmStats.totalStaked;
        } else {
          throw `Unable to find stats for ${farm}`;
        }
      } else if (type === "fee-farming") {
        const token = $store.investments[farm].rewardToken.slice(1);
        const farmStats = stats.find(st => st.asset === token);
        if (farmStats) {
          apy = +farmStats.apy;
          apr = +farmStats.apr;
          totalStaked = +farmStats.totalStaked;
        } else {
          throw `Unable to find stats for ${farm}`;
        }
      }

      dispatch("farm-apr", { id: invData.id, apr });

      // calculates ROI per week
      if (stakeInXtz) {
        roiPerWeek = (stakeInXtz * apr) / 100 / 52;
      }
    } catch (error) {
      console.error(error);
      toastStore.addToast({
        type: "error",
        title: "Error",
        text: JSON.stringify(error),
        dismissable: false
      });
    }
  };

  onMount(async () => {
    const invDetails = await loadInvestment(invData.id, $store.userAddress);
    if (invDetails) {
      store.updateInvestments({
        ...$store.investments,
        [invData.id]: {
          ...$store.investments[invData.id],
          balance: invDetails.balance,
          info: invDetails.info
        }
      });
      invData.balance = invDetails.balance;

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

        stakeInXtz = +stakes.toFixed(5) / 1;
      } else {
        stakeInXtz =
          +(
            (invData.balance / 10 ** invData.decimals) *
            $store.tokens.WRAP.exchangeRate
          ).toFixed(5) / 1;
      }
      dispatch("update-farm-value", [invName, stakeInXtz]);
    }

    await fetchStatistics(invData.type, invData.id);
  });

  afterUpdate(() => {
    if (rewards && rewards.amount && invData.platform === "wrap") {
      tippy(`#rewards-${invData.id}`, {
        content: `<div>${
          +(
            rewards.amount * $store.tokens[AvailableToken.WRAP].exchangeRate
          ).toFixed(5) / 1
        } ꜩ<br />${
          +(
            rewards.amount *
            $store.tokens[AvailableToken.WRAP].exchangeRate *
            $store.xtzData.exchangeRate
          ).toFixed(5) / 1
        } ${$localStorageStore.preferredFiat || "USD"}</div>`,
        allowHTML: true
      });
    }
  });
</script>

<div class="farm-block">
  <div class="farm-block__name">
    <div class="icons" id={`farm-${invData.id}`}>
      {#each invData.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
    <br />
    <div>
      <a
        href={`https://better-call.dev/mainnet/${invData.address}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {invData.alias}
      </a>
    </div>
    {#if apr && apy}
      <br />
      <div style="font-size:0.7rem">
        APR: {apr.toFixed(2)}%
      </div>
      <div style="font-size:0.7rem">
        APY: {apy.toFixed(2)}%
      </div>
    {/if}
    <br />
    {#each invData.icons as token}
      {#if $store.tokens[token]}
        <div style="font-size:0.7rem">
          1 {token} = {formatTokenAmount($store.tokens[token].exchangeRate)} XTZ
        </div>
      {/if}
    {/each}
  </div>
  {#if moreOptions}
    <div class="farm-block__data">More options</div>
  {:else}
    <div class="farm-block__data">
      <div class="farm-block__data__info">
        <span class="title">Stake:</span>
        <br />
        <div>
          <span class:blurry-text={$store.blurryBalances}>
            {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1} LPT
          </span>
        </div>
        {#if stakeInXtz}
          <br />
          <span class="title">Value in XTZ:</span>
          <br />
          <div class:blurry-text={$store.blurryBalances}>
            {+stakeInXtz.toFixed(5) / 1} ꜩ
          </div>
          <br />
          <span class="title">
            Value in {$localStorageStore.preferredFiat}:
          </span>
          <br />
          <div class:blurry-text={$store.blurryBalances}>
            {+(stakeInXtz * $store.xtzData.exchangeRate).toFixed(2) / 1}
            {config.validFiats.find(
              fiat => fiat.code === $localStorageStore.preferredFiat
            ).symbol}
          </div>
        {:else}
          <span class="material-icons"> hourglass_empty </span>
        {/if}
      </div>
    </div>
  {/if}
  <div class="farm-block__actions">
    <div>
      <span class="title">Available rewards:</span>
      <br />
      {#if !rewards}
        <span class="material-icons"> hourglass_empty </span>
      {:else}
        <span id={`rewards-${invData.id}`}>
          {rewards.amount ? +rewards.amount.toFixed(5) / 1 : 0}
          {$store.investments[invData.id].rewardToken}
        </span>
      {/if}
      {#if rewards?.amount}
        <br />
        <span style="font-size:0.7rem">
          ({formatTokenAmount(
            rewards.amount * $store.tokens[invData.rewardToken].exchangeRate
          )} ꜩ / {formatTokenAmount(
            rewards.amount *
              $store.tokens[invData.rewardToken].exchangeRate *
              $store.xtzData.exchangeRate,
            2
          )}
          {config.validFiats.find(
            fiat => fiat.code === $localStorageStore.preferredFiat
          ).symbol})
        </span>
      {/if}
    </div>
    <br />
    <div class="buttons stack">
      {#if harvesting}
        <button class="primary loading">
          Harvesting &nbsp;
          <span class="material-icons"> sync </span>
        </button>
      {:else if harvestingSuccess === true}
        <button class="primary success">
          Success! &nbsp;
          <span class="material-icons"> thumb_up </span>
        </button>
      {:else if harvestingSuccess === false}
        <button class="primary error" on:click={harvest}> Retry </button>
      {:else}
        <button class="primary" on:click={harvest} id={`harvest-${invData.id}`}>
          Harvest &nbsp;
          <span class="material-icons"> agriculture </span>
        </button>
      {/if}
      {#if compounding}
        <button class="primary loading">
          Harvesting &nbsp;
          <span class="material-icons"> sync </span>
        </button>
      {:else if compoundingSuccess === true}
        <button class="primary success">
          Success &nbsp;
          <span class="material-icons"> thumb_up </span>
        </button>
      {:else if compoundingSuccess === false}
        <button class="mini error" on:click={compound}> Retry </button>
      {:else}
        <button
          class="primary"
          on:click={compound}
          id={`harvest-restake-${invData.id}`}
        >
          Harvest & Restake &nbsp;
          <span class="material-icons"> save_alt </span>
        </button>
      {/if}
      {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
        <button
          class="primary"
          on:click={async () => {
            moreOptions = !moreOptions;
          }}
        >
          {#if moreOptions}
            Show less options &nbsp;
            <span class="material-icons"> expand_less </span>
          {:else}
            Show more options &nbsp;
            <span class="material-icons"> expand_more </span>
          {/if}
        </button>
      {/if}
    </div>
  </div>
</div>
{#if openSettingsModal}
  <Modal type="default" on:close={() => (openSettingsModal = false)}>
    <div slot="modal-title" class="modal-title">
      <div>Settings</div>
      <div>{invData.alias}</div>
    </div>
    <div slot="modal-body" class="modal-body">
      <div class="modal-line">
        <div>APR: {apr ? `${apr.toFixed(3)}%` : "--"}</div>
        <div>APY: {apy ? `${apy.toFixed(3)}%` : "--"}</div>
      </div>
      <br />
      <div class="modal-line" style="text-align: center">
        <div>
          {#if invData.type === "staking"}
            Total Value Staked: <br />
            {totalStaked
              ? `${(+totalStaked.toFixed(3)).toLocaleString("en-US")} XTZ (${(+(
                  totalStaked * $store.xtzData.exchangeRate
                ).toFixed(3)).toLocaleString("en-US")} ${
                  $localStorageStore.preferredFiat
                })`
              : "--"}
          {:else}
            Total Token Staked: <br />
            {totalStaked
              ? `${(+totalStaked.toFixed(3)).toLocaleString(
                  "en-US"
                )} WRAP (${(+(
                  totalStaked *
                  $store.tokens.WRAP.exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2)).toLocaleString("en-US")} ${
                  $localStorageStore.preferredFiat
                })`
              : "--"}
          {/if}
        </div>
      </div>
      <br />
      <div class="modal-line" style="text-align: center">
        <div>
          Total rewards available:
          <br />
          {#if !rewards}
            Unavailable
          {:else}
            <span>
              {+rewards.amount.toFixed(5) / 1} WRAP ({`${formatTokenAmount(
                rewards.amount * $store.tokens.WRAP.exchangeRate
              )} XTZ / ${formatTokenAmount(
                rewards.amount *
                  $store.tokens.WRAP.exchangeRate *
                  $store.xtzData.exchangeRate,
                2
              )} ${$localStorageStore.preferredFiat}`})
            </span>
          {/if}
        </div>
      </div>
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <button
        class="primary"
        on:click={() => {
          openSettingsModal = false;
        }}
      >
        Close
      </button>
    </div>
  </Modal>
{/if}
