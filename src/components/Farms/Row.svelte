<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import "tippy.js/themes/light-border.css";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import type {
    AvailableInvestments,
    InvestmentData,
    IconValue
  } from "../../types";
  import { AvailableToken } from "../../types";
  import {
    loadInvestment,
    getPlentyLqtValue,
    prepareOperation,
    formatTokenAmount
  } from "../../utils";
  import config from "../../config";

  export let investment: [AvailableInvestments, InvestmentData],
    valueInXtz: boolean,
    rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    };

  const dispatch = createEventDispatcher();
  let loading = true;
  let invName: AvailableInvestments;
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let harvestingPaul = false;
  let harvestingPaulSuccess = undefined;
  let harvestingPlenty = false;
  let harvestingPlentySuccess = undefined;
  let harvestingKdao = false;
  let harvestingKdaoSuccess = undefined;
  let harvestingWrap = false;
  let harvestingWrapSuccess = undefined;

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

  const harvestPlenty = async () => {
    harvestingPlenty = true;
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
      const receipt = await op.receipt();
      harvestingPlenty = false;
      if (!receipt) {
        harvestingPlentySuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingPlentySuccess = true;
        dispatch("reset-rewards", invData.id);
        /*toastStore.addToast({
        type: "success",
        text: `Successfully harvested ${rewardsToHarvest} PLENTY!`,
        dismissable: false
      });*/
        setTimeout(() => {
          harvestingPlentySuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      /*toastStore.addToast({
      type: "error",
      text: "Couldn't harvest PLENTY tokens",
      dismissable: false
    });*/
    } finally {
      harvestingPlenty = false;
    }
  };

  const harvestKdao = async () => {
    harvestingKdao = true;
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
      const receipt = await op.receipt();
      harvestingKdao = false;
      if (!receipt) {
        harvestingKdaoSuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingKdaoSuccess = true;
        dispatch("reset-rewards", invData.id);
        /*toastStore.addToast({
        type: "success",
        text: `Successfully harvested ${rewardsToHarvest} kDAO!`,
        dismissable: false
      });*/
        setTimeout(() => {
          harvestingKdaoSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      /*toastStore.addToast({
      type: "error",
      text: "Couldn't harvest PLENTY tokens",
      dismissable: false
    });*/
    } finally {
      harvestingKdao = false;
    }
  };

  const harvestPaul = async () => {
    harvestingPaul = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [
          invData.id === "PAUL-PAUL"
            ? contract.methods.earn($store.userAddress, false)
            : contract.methods.earn($store.userAddress)
        ],
        amount: +rewards.amount,
        tokenSymbol: AvailableToken.PAUL
      });
      const op = await batch.send();
      await op.confirmation();
      const receipt = await op.receipt();
      harvestingPaul = false;
      if (!receipt) {
        harvestingPaulSuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingPaulSuccess = true;
        dispatch("reset-rewards", invData.id);
        /*toastStore.addToast({
          type: "success",
          text: `Successfully harvested ${rewardsToHarvest} PAUL!`,
          dismissable: false
        });*/
        setTimeout(() => {
          harvestingPaulSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      /*toastStore.addToast({
        type: "error",
        text: "Couldn't harvest PAUL tokens",
        dismissable: false
      });*/
    } finally {
      harvestingPaul = false;
    }
  };

  const harvestWrap = async () => {
    console.log("harvest wrap");
  };

  onMount(async () => {
    invName = investment[0];
    invData = investment[1];

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
      stakeInXtz = await calcStakeInXtz({
        isPlentyLpToken: invData.platform === "plenty",
        id: invData.id,
        balance: invData.balance,
        decimals: invData.decimals,
        exchangeRate: $store.tokens[invData.token].exchangeRate
      });
    }

    const createTooltipContent = (icons: [IconValue, IconValue]): string => {
      const token1 = icons[0];
      const token2 = icons[1];
      const exchangeRate1 = $store.tokens[invData.icons[0]]
        ? formatTokenAmount($store.tokens[invData.icons[0]].exchangeRate)
        : "0";
      const exchangeRate2 = $store.tokens[invData.icons[1]]
        ? formatTokenAmount($store.tokens[invData.icons[1]].exchangeRate)
        : "0";

      return `<div>${token1}: ${exchangeRate1} ꜩ<br />${token2}: ${exchangeRate2} ꜩ</div>`;
    };

    tippy(`#farm-${invData.id}`, {
      content: createTooltipContent(invData.icons as [IconValue, IconValue]),
      allowHTML: true
    });

    loading = false;
  });

  afterUpdate(async () => {
    if (investment[1].balance !== invData.balance) {
      invData = { ...investment[1] };
      stakeInXtz = await calcStakeInXtz({
        isPlentyLpToken: invData.platform === "plenty",
        id: invData.id,
        balance: invData.balance,
        decimals: invData.decimals,
        exchangeRate: $store.tokens[invData.token].exchangeRate
      });
    }

    if (
      rewards &&
      rewards.amount &&
      (invData.platform === "plenty" || invData.platform === "wrap")
    ) {
      let token: AvailableToken;
      if (invData.platform === "plenty") {
        token = AvailableToken.PLENTY;
      } else if (invData.platform === "wrap") {
        token = AvailableToken.WRAP;
      } else {
        return;
      }

      tippy(`#rewards-${invData.id}`, {
        content: `<div>${
          +(rewards.amount * $store.tokens[token].exchangeRate).toFixed(5) / 1
        } ꜩ<br />${
          +(
            rewards.amount *
            $store.tokens[token].exchangeRate *
            $store.xtzData.exchangeRate
          ).toFixed(5) / 1
        } ${$localStorageStore.preferredFiat || "USD"}</div>`,
        allowHTML: true
      });
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .row {
    display: grid;
    grid-template-columns: 10% 25% 20% 17% 16% 12%;
    padding: 10px;
    align-items: center;
    transition: 0.3s;

    &:hover {
      background-color: lighten($container-bg-color, 65);
    }

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .icon {
      img {
        width: 25px;
        height: 25px;
      }
    }
  }
</style>

{#if invName && invData}
  <div class="row">
    <!-- PLENTY FARMS -->
    {#if invData.platform === "plenty"}
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
        {#if loading}
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
        {#if harvestingPlenty}
          <button class="mini loading">
            <span class="material-icons"> sync </span>
          </button>
        {:else if harvestingPlentySuccess === true}
          <button class="mini success">
            <span class="material-icons"> thumb_up </span>
          </button>
        {:else if harvestingPlentySuccess === false}
          <button class="mini error" on:click={harvestPlenty}> Retry </button>
        {:else}
          <button class="mini" on:click={harvestPlenty}>
            <span class="material-icons"> agriculture </span>
          </button>
        {/if}
        <button
          class="mini"
          on:click={() => dispatch("remove-investment", invData.id)}
        >
          <span class="material-icons"> delete </span>
        </button>
        <button class="mini">
          <span class="material-icons"> settings </span>
        </button>
      </div>
    {:else if invData.platform === "paul"}
      <div class="icon">
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
        {#if invData.id === "PAUL-PAUL"}
          <span class:blurry-text={$store.blurryBalances}>
            {+(
              ($store.tokens.PAUL.exchangeRate * invData.balance) /
              10 ** invData.decimals
            ).toFixed(5) / 1}
          </span>
        {:else}
          --
        {/if}
      </div>
      <div>
        {#if !rewards}
          <span class="material-icons"> hourglass_empty </span>
        {:else}
          {+rewards.amount.toFixed(5) / 1}
        {/if}
      </div>
      <div>
        {#if harvestingPaul}
          <button class="mini loading">
            <span class="material-icons"> sync </span>
          </button>
        {:else if harvestingPaulSuccess === true}
          <button class="mini success">
            <span class="material-icons"> thumb_up </span>
          </button>
        {:else if harvestingPaulSuccess === false}
          <button class="mini error" on:click={harvestPaul}> Retry </button>
        {:else}
          <button class="mini" on:click={harvestPaul}>
            <span class="material-icons"> agriculture </span>
          </button>
        {/if}
      </div>
    {:else if invData.platform === "kdao"}
      <div class="icon">
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
        {#if invData.id === "KUSD-KDAO"}
          <span class:blurry-text={$store.blurryBalances}>
            {+(
              ($store.tokens.kUSD.exchangeRate * invData.balance) /
              10 ** invData.decimals
            ).toFixed(5) / 1}
          </span>
        {:else}
          --
        {/if}
      </div>
      <div>
        {#if !rewards}
          <span class="material-icons"> hourglass_empty </span>
        {:else}
          {+rewards.amount.toFixed(5) / 1}
        {/if}
      </div>
      <div>
        {#if harvestingKdao}
          <button class="mini loading">
            <span class="material-icons"> sync </span>
          </button>
        {:else if harvestingKdaoSuccess === true}
          <button class="mini success">
            <span class="material-icons"> thumb_up </span>
          </button>
        {:else if harvestingKdaoSuccess === false}
          <button class="mini error" on:click={harvestKdao}> Retry </button>
        {:else}
          <button class="mini" on:click={harvestKdao}>
            <span class="material-icons"> agriculture </span>
          </button>
        {/if}
      </div>
    {:else if invData.platform === "wrap"}
      <div class="icon">
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
        <span class:blurry-text={$store.blurryBalances}>
          {+(
            ($store.tokens[invData.token].exchangeRate * invData.balance) /
            10 ** invData.decimals
          ).toFixed(5) / 1}
        </span>
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
      <div>
        {#if harvestingWrap}
          <button class="mini loading">
            <span class="material-icons"> sync </span>
          </button>
        {:else if harvestingWrapSuccess === true}
          <button class="mini success">
            <span class="material-icons"> thumb_up </span>
          </button>
        {:else if harvestingWrapSuccess === false}
          <button class="mini error" on:click={harvestWrap}> Retry </button>
        {:else}
          <button class="mini" on:click={harvestWrap}>
            <span class="material-icons"> agriculture </span>
          </button>
        {/if}
      </div>
    {/if}
  </div>
{/if}
