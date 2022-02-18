<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import type { InvestmentData, AvailableInvestments } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { loadInvestment, formatTokenAmount } from "../../../utils";
  import config from "../../../config";
  import { computeLpTokenPrice } from "../../../tokenUtils/youvesUtils";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments;
  // valueInXtz: boolean,

  let harvesting = false;
  let harvestingSuccess = undefined;
  let stakeInXtz: null | number = null;
  const dispatch = createEventDispatcher();
  let uUSDvalue: null | number = null;
  let uBTCvalue: null | number = null;

  /*const harvest = async () => {
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
          title: "Success!",
          text: `Successfully harvested ${rewardsToHarvest} kDAO!`,
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
  };*/

  onMount(async () => {
    const dexAddress = "KT1VNEzpf631BLsdPJjt2ZhgUitR392x6cSi";
    const contract = await $store.Tezos.wallet.at(dexAddress);
    const storage: any = await contract.storage();
    const pair = await storage.storage.pairs.get(21);
    if (pair) {
      const { token_a_pool, token_b_pool, total_supply } = pair;
      const lptPrice = computeLpTokenPrice(
        invData.balance,
        total_supply,
        token_a_pool,
        token_b_pool
      );
      if (lptPrice) {
        const { token1Output, token2Output } = lptPrice;
        uUSDvalue = token1Output.toNumber();
        uBTCvalue = token2Output.toNumber();

        stakeInXtz =
          (uUSDvalue / 10 ** $store.tokens.uUSD.decimals) *
            $store.tokens.uUSD.exchangeRate +
          (uBTCvalue / 10 ** $store.tokens.uBTC.decimals) *
            $store.tokens.uBTC.exchangeRate;
      }
    }

    dispatch("update-farm-value", [invName, stakeInXtz]);
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
          {#if invData.id === "YOUVES-UUSD-UBTC"}
            uUSD-uBTC <br /> Long term Farm
          {:else}
            {invData.alias}
          {/if}
        </a>
      </div>
    </div>
  </div>
  <div class="farm-block__data">
    <div class="farm-block__data__info">
      <span class="title">Stake:</span>
      <br />
      <div class:blurry-text={$store.blurryBalances}>
        <div>
          {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1}
          LPT
        </div>
        {#if uUSDvalue && uBTCvalue}
          <div style="font-size:0.8rem">
            ({formatTokenAmount(uUSDvalue / 10 ** $store.tokens.uUSD.decimals)} uUSD
            +
          </div>
          <div style="font-size:0.8rem">
            {formatTokenAmount(uBTCvalue / 10 ** $store.tokens.uBTC.decimals)} uBTC)
          </div>
        {/if}
      </div>
      <br />
      {#if stakeInXtz}
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
  <div class="farm-block__actions">
    <div>
      <span class="title">Available rewards:</span>
      <br />
      {#if !rewards}
        <!--<span class="material-icons"> hourglass_empty </span>-->
        Coming soon!
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
    <!--
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
    </div>-->
  </div>
</div>
