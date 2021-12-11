<script lang="ts">
  import {
    onMount,
    afterUpdate,
    onDestroy,
    createEventDispatcher
  } from "svelte";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import "tippy.js/themes/light-border.css";
  import type { AvailableInvestments, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import {
    prepareOperation,
    loadInvestment,
    formatTokenAmount
  } from "../../../utils";
  import {
    calcPlentyStakeInXtz,
    calcPlentyAprApy,
    getLPTokenPrice
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
    invName: AvailableInvestments;

  let harvesting = false;
  let harvestingSuccess = undefined;
  let stakeInXtz: null | number = null;
  let openSettingsModal = false;
  const dispatch = createEventDispatcher();
  let apy: null | number = null;
  let apr: null | number = null;
  let roiPerWeek: number | null = null;
  let moreOptions = false;
  let refreshStats;

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
          title: "Success!",
          text: `Successfully harvested ${rewardsToHarvest} PLENTY!`,
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
        text: "Couldn't harvest PLENTY tokens",
        dismissable: false,
        icon: "agriculture"
      });
    } finally {
      harvesting = false;
    }
  };

  const fetchStatistics = async (
    tokenPair: AvailableInvestments,
    token1: AvailableToken,
    token2: AvailableToken
  ) => {
    const lpTokenPrice = await getLPTokenPrice({
      tokenPair,
      token1_price: $store.tokens[token1].exchangeRate,
      token1_decimal: $store.tokens[token1].decimals,
      token2_price: $store.tokens[token2].exchangeRate,
      token2_decimal: $store.tokens[token2].decimals,
      lp_token_decimal: $store.investments[tokenPair].decimals,
      Tezos: $store.Tezos
    });
    const result = await calcPlentyAprApy({
      Tezos: $store.Tezos,
      farmAddress: invData.address,
      rewardTokenPriceInFiat: $store.tokens.PLENTY.exchangeRate,
      stakeTokenPriceInFiat: lpTokenPrice
    });

    apr = result.apr;
    apy = result.apy;

    dispatch("farm-apr", { id: invData.id, apr });

    // calculates estimated ROI per week
    roiPerWeek = formatTokenAmount((stakeInXtz * apr) / 100 / 52, 2);
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

    await fetchStatistics(
      invData.id,
      invData.icons[0] as AvailableToken,
      invData.icons[1] as AvailableToken
    );

    refreshStats = setInterval(
      async () =>
        await fetchStatistics(
          invData.id,
          invData.icons[0] as AvailableToken,
          invData.icons[1] as AvailableToken
        ),
      600000
    );
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

  onDestroy(() => {
    clearInterval(refreshStats);
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
      {#if apr}
        <div style="font-size:0.7rem">
          APR: {apr.toFixed(2)}%
        </div>
      {/if}
      {#if apy}
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
      {#if !invData.liquidityToken && $store.tokens[invData.rewardToken]}
        <div>
          <div class:blurry-text={$store.blurryBalances}>
            {+(invData.balance / 10 ** 18).toFixed(3) / 1} LPT
          </div>
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
        </div>
      {:else if invData.liquidityToken && invData.alias !== "PLENTY-XTZ LP farm" && $store.tokens.PLENTY.exchangeRate}
        <div>
          <div class:blurry-text={$store.blurryBalances}>
            {+(invData.balance / 10 ** 18).toFixed(3) / 1} LPT
          </div>
          {#if stakeInXtz || stakeInXtz === 0}
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
      {:else if invData.alias === "PLENTY-XTZ LP farm" && $store.tokens.PLENTY}
        <div>--</div>
      {:else}
        <div>--</div>
      {/if}
    </div>
    {#if roiPerWeek}
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
