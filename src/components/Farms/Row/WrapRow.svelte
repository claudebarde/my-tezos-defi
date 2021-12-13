<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import tippy from "tippy.js";
  import type {
    InvestmentData,
    AvailableInvestments,
    TezosContractAddress
  } from "../../../types";
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
  let apy: null | number = null;
  let apr: null | number = null;
  let totalStaked: null | number = null;
  const dispatch = createEventDispatcher();
  let moreOptions = false;
  let roiPerWeek: number | null = null;
  let newStake: {
    token: string | undefined;
    staked: number | undefined;
    available: number | undefined;
  } = {
    token: undefined,
    staked: undefined,
    available: undefined
  };
  let tokensToStake = "";
  let newUnstake: { token: string | undefined; balance: number | undefined } = {
    token: undefined,
    balance: undefined
  };
  let tokensToUnstake = "";
  let openStakeModal = false;
  let openUnstakeModal = false;

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
        roiPerWeek = formatTokenAmount((stakeInXtz * apr) / 100 / 52, 2);
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

  const stake = async () => {
    if (!tokensToStake) return;

    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const storage: any = await contract.storage();
      // gets the address of the LP token contract
      let lpTokenAddress: TezosContractAddress;
      if (invData.type === "staking") {
        lpTokenAddress = storage.addresses.lpTokenContract;
      } else {
        lpTokenAddress = $store.tokens.WRAP.address;
      }
      const lpContract = await $store.Tezos.wallet.at(lpTokenAddress);

      const batch = await $store.Tezos.wallet
        .batch()
        .withContractCall(
          lpContract.methods.update_operators([
            {
              add_operator: {
                owner: $store.userAddress,
                operator: invData.address,
                token_id: 0
              }
            }
          ])
        )
        .withContractCall(
          contract.methods[invData.type === "staking" ? "deposit" : "stake"](
            tokensToStake
          )
        )
        .withContractCall(
          lpContract.methods.update_operators([
            {
              remove_operator: {
                owner: $store.userAddress,
                operator: invData.address,
                token_id: 0
              }
            }
          ])
        );

      const batchOp = await batch.send();
      await batchOp.confirmation();
      // updates balance
      invData = {
        ...invData,
        balance: invData.balance + +tokensToStake
      };
      toastStore.addToast({
        type: "success",
        title: "Success!",
        text: `Successfully staked ${tokensToStake} ${
          invData.type === "staking" ? "LP tokens" : "WRAP tokens"
        }`,
        dismissable: false,
        icon: "file_download"
      });
    } catch (error) {
      console.error(error);
      toastStore.addToast({
        type: "error",
        title: "Error",
        text: error.hasOwnProperty("message")
          ? error.message
          : JSON.stringify(error),
        dismissable: false
      });
    }
  };

  const processNewStake = async () => {
    if (["stacking", "staking", "fee-farming"].includes(invData.type)) {
      newStake = {
        token: undefined,
        staked: undefined,
        available: undefined
      };
      tokensToStake = "";
      openStakeModal = true;
    }

    if (invData.type === "stacking" || invData.type === "fee-farming") {
      // stacking and fee farming
      const contract = await $store.Tezos.wallet.at($store.tokens.WRAP.address);
      const storage: any = await contract.storage();
      const balance = await storage.assets.ledger.get($store.userAddress);
      if (balance) {
        newStake = {
          ...newStake,
          token: "WRAP",
          available: balance.toNumber() / 10 ** $store.tokens.WRAP.decimals,
          staked: invData.balance / 10 ** $store.tokens.WRAP.decimals
        };
      } else {
        newStake = {
          ...newStake,
          token: "WRAP",
          available: 0,
          staked: invData.balance / 10 ** $store.tokens.WRAP.decimals
        };
      }
    } else if (invData.type === "staking") {
      // liquidity farming
      const contract = await $store.Tezos.wallet.at(invData.address);
      const storage: any = await contract.storage();
      const { lpTokenContract } = storage.addresses;
      // determines current stake
      const balance = await storage.delegators.get($store.userAddress);
      if (balance) {
        newStake = {
          ...newStake,
          token: "LPT",
          staked: balance.lpTokenBalance.toNumber() / 10 ** invData.decimals
        };
      } else {
        newStake = { ...newStake, token: "LPT", staked: 0 };
      }

      // determines available LP tokens
      const lptContract = await $store.Tezos.wallet.at(lpTokenContract);
      const lptStorage: any = await lptContract.storage();
      const availableBalance = await lptStorage.storage.ledger.get(
        $store.userAddress
      );
      if (availableBalance && availableBalance.balance) {
        newStake = {
          ...newStake,
          available:
            availableBalance.balance.toNumber() / 10 ** invData.decimals
        };
      } else {
        newStake = { ...newStake, available: 0 };
      }
    } else {
      return;
    }
  };

  const processNewUnstake = async () => {
    console.log("new unstake");

    openUnstakeModal = true;
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
    /*if (rewards && rewards.amount && invData.platform === "wrap") {
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
    }*/
  });
</script>

<div class="farm-block">
  <div class="farm-block__name">
    <div style="text-align:center">
      <div class="icons" id={`farm-${invData.id}`}>
        {#each invData.icons as icon}
          <img src={`images/${icon}.png`} alt="token-icon" />
        {/each}
      </div>
      <div>
        <a
          href={`https://better-call.dev/mainnet/${invData.address}/operations`}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {invData.alias}
        </a>
      </div>
    </div>
    <div>
      {#if apr && apy}
        <div style="font-size:0.7rem">
          APR: {apr.toFixed(2)}%
        </div>
        <div style="font-size:0.7rem">
          APY: {apy.toFixed(2)}%
        </div>
      {/if}
    </div>
    <div>
      {#each invData.icons as token}
        {#if $store.tokens[token]}
          <div style="font-size:0.7rem">
            1 {token} = {formatTokenAmount($store.tokens[token].exchangeRate)} XTZ
          </div>
        {/if}
      {/each}
    </div>
  </div>
  <div class="farm-block__data">
    <div class="farm-block__data__info">
      <span class="title">Stake:</span>
      <br />
      <div>
        <span class:blurry-text={$store.blurryBalances}>
          {#if invData.type === "stacking" || invData.type === "fee-farming"}
            {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1} WRAP
          {:else}
            {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1} LPT
          {/if}
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
    {#if roiPerWeek || roiPerWeek === 0}
      <br />
      <div class="farm-block__data__info">
        <span class="title">Estimated ROI/week:</span>
        <br />
        <div>
          {roiPerWeek} ꜩ
        </div>
      </div>
    {/if}
  </div>
  <div class="farm-block__actions">
    {#if !moreOptions}
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
    {/if}
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
      {#if moreOptions}
        <button class="primary" on:click={processNewStake}>
          Stake &nbsp;
          <span class="material-icons"> file_download </span>
        </button>
        <button class="primary" on:click={processNewUnstake}>
          Unstake &nbsp;
          <span class="material-icons"> file_upload </span>
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
            Show rewards &nbsp;
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
{#if openStakeModal || openUnstakeModal}
  <Modal
    type="default"
    on:close={() => {
      openStakeModal = false;
      openUnstakeModal = false;
    }}
  >
    <div slot="modal-title" class="modal-title">
      <div>
        {#if openStakeModal}
          {#if invData.type === "staking"}
            <div>Stake {invData.icons.join("-")} LP tokens</div>
          {:else}
            <div>Stake WRAP tokens</div>
          {/if}
        {:else if openUnstakeModal}
          {#if invData.type === "fee-farming"}
            <div>Unstake {invData.rewardToken} tokens</div>
          {:else if invData.type === "staking"}
            <div>Unstake {invData.icons.join("-")} LP tokens</div>
          {:else}
            <div>Unstake WRAP tokens</div>
          {/if}
        {/if}
      </div>
      <div>
        <div class="icons">
          {#each invData.icons as icon}
            <img src={`images/${icon}.png`} alt="token-icon" />
          {/each}
        </div>
      </div>
    </div>
    <div slot="modal-body" class="modal-body">
      {#if openStakeModal}
        {#if newStake.available || newStake.available === 0}
          <div class="modal-line">
            <div>
              Your balance: {formatTokenAmount(newStake.available)}
              {newStake.token}
            </div>
          </div>
          <div class="modal-line">
            <div class="input-with-button">
              <input
                type="text"
                placeholder="Tokens to stake"
                bind:value={tokensToStake}
              />
              <button
                on:click={() => (tokensToStake = newStake.available.toString())}
              >
                Max: {formatTokenAmount(newStake.available)}
              </button>
            </div>
          </div>
          <div class="modal-line">
            Current stake: {formatTokenAmount(
              invData.balance / 10 ** invData.decimals
            )}
            {invData.type === "stacking" || invData.type === "fee-farming"
              ? "WRAP"
              : "LPT"}
          </div>
          <div class="modal-line">
            New stake:
            {#if tokensToStake && +tokensToStake > 0}
              {formatTokenAmount(
                invData.balance / 10 ** invData.decimals + +tokensToStake
              )}
              {invData.type === "stacking" || invData.type === "fee-farming"
                ? "WRAP"
                : "LPT"}
            {:else}
              No change
            {/if}
          </div>
        {:else}
          <div>Loading...</div>
        {/if}
      {:else if openUnstakeModal}
        <div class="modal-line">unstake</div>
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        {#if openStakeModal}
          <button class="primary" disabled={!tokensToStake} on:click={stake}>
            Stake
          </button>
        {:else if openUnstakeModal}
          <button class="primary" disabled={!tokensToUnstake}> Unstake </button>
        {/if}
        <button
          class="primary"
          on:click={() => {
            openStakeModal = false;
            openUnstakeModal = false;
          }}
        >
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
