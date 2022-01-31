<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import { InvestmentData, AvailableInvestments } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import {
    loadInvestment,
    prepareOperation,
    formatTokenAmount
  } from "../../../utils";
  import {
    calcTokenStakesInAlienFarm,
    calcTokenStakesFromQuipu,
    calcPaulFarmApr
  } from "../../../tokenUtils/paulUtils";
  import toastStore from "../../Toast/toastStore";
  import config from "../../../config";
  import PaulStakeUnstake from "../Modals/PaulStakeUnstake.svelte";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments;

  let harvesting = false;
  let harvestingSuccess = undefined;
  let loadingStakeInXtz = true;
  let stakeInXtz: null | number = null;
  const dispatch = createEventDispatcher();
  let apr: number | null = null;
  let roiPerWeek: number | null = null;
  let moreOptions = false;
  let openStakeModal = false;
  let openUnstakeModal = false;

  const harvest = async () => {
    harvesting = true;
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
      harvesting = false;
      const opStatus = await op.status();
      if (opStatus === "applied") {
        harvestingSuccess = true;
        dispatch("reset-rewards", invData.id);
        toastStore.addToast({
          type: "success",
          title: "Success",
          text: `Successfully harvested ${rewardsToHarvest} PAUL!`,
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
        text: "Couldn't harvest PAUL tokens",
        dismissable: false,
        icon: "agriculture"
      });
    } finally {
      harvesting = false;
    }
  };

  const compound = async () => {
    console.log("compound paul");
  };

  onMount(async () => {
    const invDetails = await loadInvestment(invData.id, $store.userAddress);
    if (invDetails) {
      store.updateInvestments({
        ...$store.investments,
        [invData.id]: {
          ...$store.investments[invData.id],
          balance: invDetails.balance
        }
      });
      invData.balance = invDetails.balance;

      if (invData.id === "PAUL-XTZ" || invData.id === "MAG-XTZ") {
        stakeInXtz = await calcTokenStakesFromQuipu({
          Tezos: $store.Tezos,
          id: invData.id,
          balance: invData.balance,
          paulToken: {
            decimals: $store.tokens.PAUL.decimals,
            exchangeRate: $store.tokens.PAUL.exchangeRate
          }
        });
      } else if (invData.id === "PAUL-PAUL") {
        stakeInXtz = formatTokenAmount(
          (invData.balance / 10 ** invData.decimals) *
            $store.tokens.PAUL.exchangeRate
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
              $store.tokens[invData.icons[0]].exchangeRate) /
            10 ** 6;
          const token2InXtz =
            ((shares.tokenBAmount /
              10 ** $store.tokens[invData.icons[1]].decimals) *
              $store.tokens[invData.icons[1]].exchangeRate) /
            10 ** 6;
          stakeInXtz = formatTokenAmount(token1InXtz + token2InXtz);
        }
      }
      loadingStakeInXtz = false;

      dispatch("update-farm-value", [invName, stakeInXtz]);
    }

    apr = await calcPaulFarmApr({
      Tezos: $store.Tezos,
      farmId: invData.id,
      farmAddress: invData.address,
      earnCoinPrice: $store.tokens.PAUL.exchangeRate,
      tokenDecimals: $store.tokens.PAUL.decimals,
      paulPrice: $store.tokens.PAUL.exchangeRate
    });
    dispatch("farm-apr", { id: invData.id, apr });

    // calculates estimated ROI per week
    roiPerWeek = formatTokenAmount((stakeInXtz * apr) / 100 / 52, 2);
    dispatch("roi-per-week", roiPerWeek);
  });

  afterUpdate(async () => {
    if (rewards && rewards.amount && invData.platform === "paul") {
      tippy(`#rewards-${invData.id}`, {
        content: `<div>${
          +(
            rewards.amount * $store.tokens[AvailableToken.PAUL].exchangeRate
          ).toFixed(5) / 1
        } ꜩ<br />${
          +(
            rewards.amount *
            $store.tokens[AvailableToken.PAUL].exchangeRate *
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
      <div class:blurry-text={$store.blurryBalances}>
        {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1}
        {invData.id === "PAUL-PAUL" ? AvailableToken.PAUL : "LPT"}
      </div>
      <br />
      {#if stakeInXtz && !loadingStakeInXtz}
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
      {:else if loadingStakeInXtz}
        <span class="material-icons"> hourglass_empty </span>
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
    {/if}
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
      {#if invData.id === AvailableInvestments["PAUL-PAUL"]}
        <button class="primary" on:click={compound}>
          Harvest & Restake &nbsp;
          <span class="material-icons"> save_alt </span>
        </button>
      {/if}
      {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
        {#if moreOptions}
          <button
            class="primary"
            on:click={() => (openStakeModal = !openStakeModal)}
          >
            Stake &nbsp;
            <span class="material-icons"> file_download </span>
          </button>
          <button
            class="primary"
            on:click={() => (openUnstakeModal = !openUnstakeModal)}
          >
            Unstake &nbsp;
            <span class="material-icons"> file_upload </span>
          </button>
        {/if}
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
{#if openStakeModal || openUnstakeModal}
  <PaulStakeUnstake
    on:close={() => {
      openStakeModal = false;
      openUnstakeModal = false;
    }}
    type={openStakeModal ? "stake" : "unstake"}
    {invData}
  />
{/if}
