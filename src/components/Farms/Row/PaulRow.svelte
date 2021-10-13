<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import { InvestmentData, AvailableInvestments } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { loadInvestment } from "../../../utils";

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

  const harvest = async () => {
    console.log("harvest paul");
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
          balance: invDetails.balance,
          info: invDetails.info
        }
      });
      invData.balance = invDetails.balance;
      stakeInXtz =
        +(
          (invData.balance / 10 ** invData.decimals) *
          $store.tokens[invData.token].exchangeRate
        ).toFixed(5) / 1;
      dispatch("update-farm-value", [invName, stakeInXtz]);
      return stakeInXtz;
    }

    tippy(`#farm-${invData.id}`, {
      content: createTooltipContent(invData),
      allowHTML: true
    });
  });

  afterUpdate(() => {
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

<div class="farm-row">
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
      <span class:blurry-text={$store.blurryBalances}>
        {+(
          ($store.tokens[invData.token].exchangeRate * invData.balance) /
          10 ** invData.decimals
        ).toFixed(5) / 1}
      </span>
    {:else}
      <span class:blurry-text={$store.blurryBalances}>
        {+(
          (($store.tokens[invData.token].exchangeRate * invData.balance) /
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
    {#if invData.id === AvailableInvestments["PAUL-PAUL"]}
      <button class="mini" on:click={compound}>
        <span class="material-icons"> save_alt </span>
      </button>
    {/if}
    <button class="mini">
      <span class="material-icons"> settings </span>
    </button>
  </div>
</div>
