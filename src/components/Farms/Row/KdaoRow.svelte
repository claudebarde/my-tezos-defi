<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import type { InvestmentData, AvailableInvestments } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import {
    loadInvestment,
    prepareOperation,
    estimateQuipuTezInShares,
    estimateQuipuTokenInShares,
    formatTokenAmount
  } from "../../../utils";
  import toastStore from "../../Toast/toastStore";
  import config from "../../../config";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments,
    // valueInXtz: boolean,
    createTooltipContent;

  let harvesting = false;
  let harvestingSuccess = undefined;
  let stakeInXtz: null | number = null;
  const dispatch = createEventDispatcher();

  const harvest = async () => {
    harvesting = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.claim([["unit"]])],
        amount: +rewards.amount,
        tokenSymbol: AvailableToken.KDAO
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
          text: `Successfully harvested ${rewardsToHarvest} kDAO!`,
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
      if (invData.id === "KUSD-KDAO") {
        stakeInXtz =
          +(
            (invData.balance / 10 ** invData.decimals) *
            $store.tokens[invData.rewardToken].exchangeRate
          ).toFixed(5) / 1;
      } else if (invData.id === "KUSD-QUIPU-LP") {
        const tezInStakesRaw = await estimateQuipuTezInShares(
          $store.Tezos,
          "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
          invData.balance
        );
        const tezInStakes = tezInStakesRaw.toNumber() / 10 ** 6;
        const tokensInStakesRaw = await estimateQuipuTokenInShares(
          $store.Tezos,
          "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
          invData.balance
        );
        const tokensInStakes =
          (tokensInStakesRaw.toNumber() / 10 ** $store.tokens.kUSD.decimals) *
          $store.tokens.kUSD.exchangeRate;

        stakeInXtz = formatTokenAmount(tezInStakes + tokensInStakes);
      }

      dispatch("update-farm-value", [invName, stakeInXtz]);
    }

    tippy(`#farm-${invData.id}`, {
      content: createTooltipContent(invData.icons[0], invData.icons[1]),
      allowHTML: true,
      placement: "left"
    });
  });

  afterUpdate(() => {
    if (rewards && rewards.amount && invData.platform === "kdao") {
      tippy(`#rewards-${invData.id}`, {
        content: `<div>${
          +(
            rewards.amount * $store.tokens[AvailableToken.KDAO].exchangeRate
          ).toFixed(5) / 1
        } ꜩ<br />${
          +(
            rewards.amount *
            $store.tokens[AvailableToken.KDAO].exchangeRate *
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
      <div class:blurry-text={$store.blurryBalances}>
        {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1} LPT
      </div>
      <br />
      {#if stakeInXtz}
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
        <button class="primary" on:click={harvest}>
          Harvest &nbsp;
          <span class="material-icons"> agriculture </span>
        </button>
      {/if}
    </div>
  </div>
</div>

<!--<div class="farm-row">
  <div class="icon" id={`farm-${invData.id}`}>
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
  <div>
    <span class:blurry-text={$store.blurryBalances}>
      {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1}
    </span>
  </div>
  <div>
    {#if valueInXtz}
      {#if invData.id === "KUSD-KDAO"}
        <span class:blurry-text={$store.blurryBalances}>
          {+(
            ($store.tokens[invData.rewardToken].exchangeRate *
              invData.balance) /
            10 ** invData.decimals
          ).toFixed(5) / 1}
        </span>
      {:else if invData.id === "KUSD-QUIPU-LP"}
        <span class:blurry-text={$store.blurryBalances}
          >{stakeInXtz ?? "---"}</span
        >
      {/if}
    {:else}
      <span class:blurry-text={$store.blurryBalances}>
        {+(
          (($store.tokens[invData.rewardToken].exchangeRate * invData.balance) /
            10 ** invData.decimals) *
          $store.xtzData.exchangeRate
        ).toFixed(2) / 1}
      </span>
    {/if}
  </div>
  <div>
    {#if !rewards}
      <span class="material-icons"> hourglass_empty </span>
    {:else}
      <span id={`rewards-${invData.id}`}>
        {+rewards.amount.toFixed(5) / 1}
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
      <button class="mini" on:click={harvest}>
        <span class="material-icons"> agriculture </span>
      </button>
    {/if}
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <button class="mini">
        <span class="material-icons"> settings </span>
      </button>
    {/if}
  </div>
</div>-->
