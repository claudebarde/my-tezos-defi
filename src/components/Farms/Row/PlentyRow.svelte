<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import "tippy.js/themes/light-border.css";
  import type { AvailableInvestments, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { prepareOperation, loadInvestment } from "../../../utils";
  import {
    calcPlentyStakeInXtz,
    calcPlentyAprApy
  } from "../../../tokenUtils/plentyUtils";
  import toastStore from "../../Toast/toastStore";
  import Modal from "../../Modal/Modal.svelte";
  import config from "../../../config";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments,
    //valueInXtz: boolean,
    createTooltipContent;

  let harvesting = false;
  let harvestingSuccess = undefined;
  let stakeInXtz: null | number = null;
  let openSettingsModal = false;
  const dispatch = createEventDispatcher();
  let expand = false;
  let roiPerWeek: number | null = null;

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

  const fetchStatistics = async () => {
    await calcPlentyAprApy({
      Tezos: $store.Tezos,
      farmAddress: invData.address,
      rewardTokenPriceInFiat: 0.5562893951539197, //$store.tokens.PLENTY.exchangeRate,
      stakeTokenPriceInFiat: 1.4976254962101335 //$store.tokens[invData.icons[1]].exchangeRate
    });
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
      if (!invDetails.balance) {
        stakeInXtz = 0;
      } else {
        stakeInXtz = await calcPlentyStakeInXtz({
          isPlentyLpToken: invData.platform === "plenty",
          id: invData.id,
          balance: invData.balance,
          decimals: invData.decimals,
          exchangeRate: $store.tokens[invData.rewardToken].exchangeRate,
          rewardToken: invData.rewardToken
        });
        dispatch("update-farm-value", [invName, stakeInXtz]);
      }
    }

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

    tippy(`#farm-${invData.id}`, {
      content: createTooltipContent(invData.icons[0], invData.icons[1]),
      allowHTML: true,
      placement: "left"
    });
  });
</script>

<div class="farm-block">
  <div class="farm-block__name">
    <div class="icons">
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
  </div>
  <div class="farm-block__data">
    <div class="farm-block__data__info">
      <span class="title">Stake:</span>
      <br />
      {#if !invData.liquidityToken && $store.tokens[invData.rewardToken]}
        <div>
          <div class:blurry-text={$store.blurryBalances}>
            {+(invData.balance / 10 ** invData.decimals).toFixed(3) / 1} LPT
          </div>
          <br />
          <span class="title">Stake in XTZ:</span>
          <br />
          <div class:blurry-text={$store.blurryBalances}>
            {+stakeInXtz.toFixed(5) / 1} ꜩ
          </div>
          <br />
          <span class="title">
            Stake in {$localStorageStore.preferredFiat}:
          </span>
          <br />
          <div class:blurry-text={$store.blurryBalances}>
            {+(stakeInXtz * $store.xtzData.exchangeRate).toFixed(2) / 1}
            {config.validFiats.find(
              fiat => fiat.code === $localStorageStore.preferredFiat
            ).symbol}
          </div>
        </div>
      {:else if invData.liquidityToken && invData.alias !== "PLENTY-XTZ LP farm" && $store.tokens.PLENTY.exchangeRate}
        <div>
          <div class:blurry-text={$store.blurryBalances}>
            {+(invData.balance / 10 ** invData.decimals).toFixed(3) / 1} LPT
          </div>
          {#if stakeInXtz || stakeInXtz === 0}
            <br />
            <span class="title">Stake in XTZ:</span>
            <br />
            <div class:blurry-text={$store.blurryBalances}>
              {+stakeInXtz.toFixed(5) / 1} ꜩ
            </div>
            <br />
            <span class="title">
              Stake in {$localStorageStore.preferredFiat}:
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
      {:else if invData.alias === "PLENTY-XTZ LP farm" && $store.tokens.PLENTY}
        <div>--</div>
      {:else}
        <div>--</div>
      {/if}
    </div>
  </div>
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
      <button
        class="primary"
        on:click={() => dispatch("remove-investment", invData.id)}
        id={`remove-${invData.id}`}
      >
        Remove &nbsp;
        <span class="material-icons"> delete </span>
      </button>
      <button
        class="primary"
        on:click={async () => {
          if (!expand) {
            await fetchStatistics();
          }
          expand = !expand;
        }}
      >
        Show more options &nbsp;
        <span class="material-icons">
          {#if expand}
            expand_less
          {:else}
            expand_more
          {/if}
        </span>
      </button>
    </div>
  </div>
</div>
<!--<div class="farm-row" class:expanded={expand}>
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
    {#if !invData || isNaN(invData.balance)}
      <span class="material-icons"> hourglass_empty </span>
    {:else}
      <span class:blurry-text={$store.blurryBalances}>
        {+(invData.balance / 10 ** invData.decimals).toFixed(3) / 1}
      </span>
    {/if}
  </div>
  <div>
    {#if !invData.liquidityToken && $store.tokens[invData.rewardToken]}
      <div>
        {#if valueInXtz}
          <span class:blurry-text={$store.blurryBalances}>
            {stakeInXtz}
          </span>
        {:else}
          <span class:blurry-text={$store.blurryBalances}>
            {+(stakeInXtz * $store.xtzData.exchangeRate).toFixed(5) / 1}
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
    <button
      class="mini"
      on:click={async () => {
        if (!expand) {
          await fetchStatistics();
        }
        expand = !expand;
      }}
    >
      <span class="material-icons">
        {#if expand}
          expand_less
        {:else}
          expand_more
        {/if}
      </span>
    </button>
  </div>
</div>
{#if expand}
  <div class="farm-sub-row expanded" transition:slide={{ duration: 300 }}>
    <div>
      {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
        <button
          class="mini"
          on:click={async () => {
            openSettingsModal = !openSettingsModal;
          }}
        >
          <span class="material-icons"> settings </span>
        </button>
      {/if}
    </div>
    <div style="grid-column: 2 / span 2">APR & APY</div>
    <div style="grid-column: 4 / span 2">
      <span>ROI/week &#8776;</span>
      <span>
        {#if roiPerWeek}
          {formatTokenAmount(roiPerWeek, 2)} XTZ
        {:else}
          <span class="material-icons"> hourglass_empty </span>
        {/if}
      </span>
    </div>
  </div>
{/if}-->
{#if openSettingsModal}
  <Modal type="default" on:close={() => (openSettingsModal = false)}>
    <div slot="modal-title" class="modal-title">
      <div>Settings</div>
      <div>{invData.alias}</div>
    </div>
    <div slot="modal-body" class="modal-body">Body</div>
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
