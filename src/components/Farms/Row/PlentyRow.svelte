<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import "tippy.js/themes/light-border.css";
  import type { AvailableInvestments, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import {
    prepareOperation,
    getPlentyLqtValue,
    loadInvestment
  } from "../../../utils";
  import config from "../../../config";
  import toastStore from "../../Toast/toastStore";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments,
    valueInXtz: boolean,
    createTooltipContent;

  let harvesting = false;
  let harvestingSuccess = undefined;
  let stakeInXtz: null | number = null;
  const dispatch = createEventDispatcher();

  const calcStakeInXtz = async ({
    isPlentyLpToken,
    id,
    balance,
    decimals,
    exchangeRate
  }: {
    id: AvailableInvestments;
    isPlentyLpToken: boolean;
    balance: number;
    decimals: number;
    exchangeRate: number;
  }): Promise<number> => {
    if (!balance) return 0;

    if (!isPlentyLpToken) {
      const stakeInXtz =
        +((balance / 10 ** decimals) * exchangeRate).toFixed(5) / 1;
      dispatch("update-farm-value", [invName, stakeInXtz]);
      return stakeInXtz;
    } else {
      const tokens = await getPlentyLqtValue(
        id,
        config.plentyDexAddresses[id],
        balance,
        $store.Tezos
      );
      if (!tokens) {
        return 0;
      } else {
        const stakeInXtz =
          (tokens.token1Amount / 10 ** $store.tokens.PLENTY.decimals) *
            $store.tokens.PLENTY.exchangeRate +
          (tokens.token2Amount / 10 ** $store.tokens[tokens.token2].decimals) *
            $store.tokens[tokens.token2].exchangeRate;
        dispatch("update-farm-value", [invName, stakeInXtz]);

        return +stakeInXtz.toFixed(5) / 1;
      }
    }
  };

  const harvest = async () => {
    harvesting = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.GetReward([["unit"]])],
        amount: +rewards.amount,
        tokenSymbol: AvailableToken.PLENTY
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
          text: `Successfully harvested ${rewardsToHarvest} PLENTY!`,
          dismissable: false
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
        text: "Couldn't harvest PLENTY tokens",
        dismissable: false
      });
    } finally {
      harvesting = false;
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
      stakeInXtz = await calcStakeInXtz({
        isPlentyLpToken: invData.platform === "plenty",
        id: invData.id,
        balance: invData.balance,
        decimals: invData.decimals,
        exchangeRate: $store.tokens[invData.token].exchangeRate
      });
    }

    tippy(`#farm-${invData.id}`, {
      content: createTooltipContent(invData),
      allowHTML: true,
      placement: "left"
    });

    tippy(`#harvest-${invData.id}`, {
      content: "Harvest"
    });

    tippy(`#remove-${invData.id}`, {
      content: "Remove"
    });
  });

  afterUpdate(() => {
    if (rewards && rewards.amount && invData.platform === "plenty") {
      tippy(`#rewards-${invData.id}`, {
        content: `<div>${
          +(
            rewards.amount * $store.tokens[AvailableToken.PLENTY].exchangeRate
          ).toFixed(5) / 1
        } ꜩ<br />${
          +(
            rewards.amount *
            $store.tokens[AvailableToken.PLENTY].exchangeRate *
            $store.xtzData.exchangeRate
          ).toFixed(5) / 1
        } ${$localStorageStore.preferredFiat || "USD"}</div>`,
        allowHTML: true
      });
    }
  });
</script>

<div class="farm-row">
  <div style="display:flex">
    <div class="icon" id={`farm-${invData.id}`}>
      {#each invData.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
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
  <div>
    {#if !invData || !invData.balance}
      <span class="material-icons"> hourglass_empty </span>
    {:else}
      <span class:blurry-text={$store.blurryBalances}>
        {+(invData.balance / 10 ** invData.decimals).toFixed(3) / 1}
      </span>
      <!--
              <span style="font-size:0.7rem"> (8%) </span>
            -->
    {/if}
  </div>
  <div>
    {#if !invData.liquidityToken && $store.tokens[invData.token]}
      <div>
        {#if valueInXtz}
          <span class:blurry-text={$store.blurryBalances}>
            {#await calcStakeInXtz( { isPlentyLpToken: false, id: invData.id, balance: invData.balance, decimals: invData.decimals, exchangeRate: $store.tokens[invData.token].exchangeRate } ) then stakeInXtz}
              {stakeInXtz}
            {/await}
          </span>
        {:else}
          <span class:blurry-text={$store.blurryBalances}>
            {#await calcStakeInXtz( { isPlentyLpToken: false, id: invData.id, balance: invData.balance, decimals: invData.decimals, exchangeRate: $store.tokens[invData.token].exchangeRate } ) then stakeInXtz}
              {+(stakeInXtz * $store.xtzData.exchangeRate).toFixed(5) / 1}
            {/await}
          </span>
        {/if}
      </div>
    {:else if invData.liquidityToken && invData.alias !== "PLENTY-XTZ LP farm" && $store.tokens.PLENTY.exchangeRate}
      <div>
        {#if valueInXtz}
          <span class:blurry-text={$store.blurryBalances}>
            {#if stakeInXtz || stakeInXtz === 0}
              {stakeInXtz}
            {:else}
              <span class="material-icons"> hourglass_empty </span>
            {/if}
          </span>
        {:else}
          <span class:blurry-text={$store.blurryBalances}>
            {#if stakeInXtz || stakeInXtz === 0}
              {+(stakeInXtz * $store.xtzData.exchangeRate).toFixed(5) / 1}
            {:else}
              <span class="material-icons"> hourglass_empty </span>
            {/if}
          </span>
        {/if}
      </div>
    {:else if invData.alias === "PLENTY-XTZ LP farm" && $store.tokens.PLENTY}
      <div>--</div>
    {:else}
      <div>--</div>
    {/if}
  </div>
  <div>
    {#if !rewards}
      <span class="material-icons"> hourglass_empty </span>
    {:else}
      <span id={`rewards-${invData.id}`}>
        {rewards.amount ? +rewards.amount.toFixed(5) / 1 : 0}
      </span>
    {/if}
  </div>
  <div class="buttons">
    {#if harvesting}
      <button class="mini loading">
        <span class="material-icons"> sync </span>
      </button>
    {:else if harvestingSuccess === true}
      <button class="mini success">
        <span class="material-icons"> thumb_up </span>
      </button>
    {:else if harvestingSuccess === false}
      <button class="mini error" on:click={harvest}> Retry </button>
    {:else}
      <button class="mini" on:click={harvest} id={`harvest-${invData.id}`}>
        <span class="material-icons"> agriculture </span>
      </button>
    {/if}
    <button
      class="mini"
      on:click={() => dispatch("remove-investment", invData.id)}
      id={`remove-${invData.id}`}
    >
      <span class="material-icons"> delete </span>
    </button>
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <button class="mini">
        <span class="material-icons"> settings </span>
      </button>
    {/if}
  </div>
</div>
