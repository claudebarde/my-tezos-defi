<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import store from "../../store";
  import {
    calcTotalShareValueInTez,
    shortenHash,
    prepareOperation,
    getPlentyLqtValue
  } from "../../utils";
  import ManagePlenty from "../Modal/ManagePlenty.svelte";
  import { AvailableToken } from "../../types";
  import toastStore from "../Toast/toastStore";
  import config from "../../config";

  export let data, platform, valueInXtz, rewards;

  const dispatch = createEventDispatcher();
  let harvestingPaul = false;
  let harvestingPaulSuccess = undefined;
  let harvestingPlenty = false;
  let harvestingPlentySuccess = undefined;
  let harvestingKdao = false;
  let harvestingKdaoSuccess = undefined;

  const harvestPaul = async () => {
    harvestingPaul = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(data.address);
      const batch = prepareOperation({
        contractCalls: [
          data.id === "PAUL-PAUL"
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
        dispatch("reset-rewards", data.id);
        toastStore.addToast({
          type: "success",
          text: `Successfully harvested ${rewardsToHarvest} PAUL!`,
          dismissable: false
        });
        setTimeout(() => {
          harvestingPaulSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        text: "Couldn't harvest PAUL tokens",
        dismissable: false
      });
    } finally {
      harvestingPaul = false;
    }
  };

  const harvestPlenty = async () => {
    harvestingPlenty = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(data.address);
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
        dispatch("reset-rewards", data.id);
        toastStore.addToast({
          type: "success",
          text: `Successfully harvested ${rewardsToHarvest} PLENTY!`,
          dismissable: false
        });
        setTimeout(() => {
          harvestingPlentySuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        text: "Couldn't harvest PLENTY tokens",
        dismissable: false
      });
    } finally {
      harvestingPlenty = false;
    }
  };

  const harvestKdao = async () => {
    harvestingKdao = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const contract = await $store.Tezos.wallet.at(data.address);
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
        dispatch("reset-rewards", data.id);
        toastStore.addToast({
          type: "success",
          text: `Successfully harvested ${rewardsToHarvest} kDAO!`,
          dismissable: false
        });
        setTimeout(() => {
          harvestingKdaoSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        text: "Couldn't harvest PLENTY tokens",
        dismissable: false
      });
    } finally {
      harvestingKdao = false;
    }
  };
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .row {
    display: grid;
    grid-template-columns: 10% 25% 20% 17% 16% 12%;
    padding: 5px 10px;
    align-items: center;

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

  .lbt-symbol {
    display: inline-block;
    width: 28px;
    height: 28px;
    vertical-align: bottom;
    border: solid 2px white;
    border-radius: 50%;
    line-height: 28px;
    text-align: center;
  }
</style>

<div class="row">
  {#if platform === "quipuswap" || platform === "plenty"}
    <div class="icon">
      {#each data.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
    <div>
      <a
        href={`https://better-call.dev/mainnet/${data.address}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {data.alias}
      </a>
    </div>
    <div>
      <span class:blurry-text={$store.blurryBalances}>
        {+(data.balance / 10 ** data.decimals).toFixed(3) / 1}
      </span>
      <!--
        <span style="font-size:0.7rem"> (8%) </span>
      -->
    </div>
  {/if}
  {#if platform === "quipuswap"}
    <div>--</div>
    <div>--</div>
  {:else if platform === "plenty"}
    <!-- PLENTY -->
    {#if !data.liquidityToken && $store.tokensExchangeRates[data.token]}
      <div>
        {#if valueInXtz}
          <span class:blurry-text={$store.blurryBalances}>
            {+(
              (data.balance / 10 ** data.decimals) *
              $store.tokensExchangeRates[data.token].tokenToTez
            ).toFixed(5) / 1}
          </span>
        {:else}
          <span class:blurry-text={$store.blurryBalances}>
            {+(
              +(
                ((data.balance / 10 ** data.decimals) *
                  $store.tokensExchangeRates[data.token].tokenToTez) /
                1
              ) * $store.xtzData.exchangeRate
            ).toFixed(5) / 1}
          </span>
        {/if}
      </div>
    {:else if data.liquidityToken && data.alias !== "PLENTY-XTZ LP farm"}
      <div>
        {#await getPlentyLqtValue(data.id, config.plentyDexAddresses[data.id], +data.balance, $store.Tezos)}
          <span class="material-icons"> hourglass_empty </span>
        {:then tokens}
          {#if tokens === null}
            <span>--</span>
          {:else}
            <!-- Total value -->
            {#if valueInXtz}
              <span class:blurry-text={$store.blurryBalances}>
                {+(
                  (tokens.token1Amount / 10 ** $store.tokens.PLENTY.decimals) *
                    $store.tokensExchangeRates.PLENTY.tokenToTez +
                  (tokens.token2Amount /
                    10 ** $store.tokens[tokens.token2].decimals) *
                    $store.tokensExchangeRates[tokens.token2].tokenToTez
                ).toFixed(5) / 1}
              </span>
            {:else}
              <span class:blurry-text={$store.blurryBalances}>
                {+(
                  ((tokens.token1Amount / 10 ** $store.tokens.PLENTY.decimals) *
                    $store.tokensExchangeRates.PLENTY.tokenToTez +
                    (tokens.token2Amount /
                      10 ** $store.tokens[tokens.token2].decimals) *
                      $store.tokensExchangeRates[tokens.token2].tokenToTez) *
                  $store.xtzData.exchangeRate
                ).toFixed(5) / 1}
              </span>
            {/if}
          {/if}
        {:catch _}
          <span>--</span>
        {/await}
      </div>
    {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
      <div>
        {#if valueInXtz}
          <span class:blurry-text={$store.blurryBalances}>
            {+calcTotalShareValueInTez(
              data.balance,
              data.shareValueInTez,
              $store.tokensExchangeRates.PLENTY.tokenToTez,
              $store.tokens.PLENTY.decimals
            ).toFixed(5) / 1}
          </span>
        {:else}
          <span class:blurry-text={$store.blurryBalances}>
            {(
              +(
                calcTotalShareValueInTez(
                  data.balance,
                  data.shareValueInTez,
                  $store.tokensExchangeRates.PLENTY.tokenToTez,
                  $store.tokens.PLENTY.decimals
                ) / 1
              ) * $store.xtzData.exchangeRate
            ).toFixed(5)}
          </span>
        {/if}
      </div>
    {:else}
      <div>--</div>
    {/if}
    <div>
      {#if !rewards}
        <span class="material-icons"> hourglass_empty </span>
      {:else}
        {rewards.amount ? +rewards.amount.toFixed(5) / 1 : 0}
      {/if}
    </div>
    <div>
      {#if harvestingPlenty}
        <button class="button investments loading">
          <span class="material-icons"> sync </span>
        </button>
      {:else if harvestingPlentySuccess === true}
        <button class="button main success">
          <span class="material-icons"> thumb_up </span>
        </button>
      {:else if harvestingPlentySuccess === false}
        <button class="button main error" on:click={harvestPlenty}>
          Retry
        </button>
      {:else}
        <button class="button investments" on:click={harvestPlenty}>
          <span class="material-icons"> agriculture </span>
        </button>
      {/if}
      <ManagePlenty
        contractAddress={data.address}
        alias={data.alias}
        id={data.id}
      />
    </div>
  {:else if platform === "crunchy"}
    <!-- CRUNCHY FARMS have a zero balance but data in the info array -->
    {#each data.info as farm}
      {#if farm.farmId < 3 && farm.amount > 0}
        <div class="icon">
          {#if farm.farmId == 0}
            <img src="images/XTZ.png" alt="token-icon" />
            <img src="images/CRUNCH.png" alt="token-icon" />
          {:else if farm.farmId == 1}
            <img src="images/XTZ.png" alt="token-icon" />
            <img src="images/kUSD.png" alt="token-icon" />
          {:else if farm.farmId == 2}
            <img src="images/XTZ.png" alt="token-icon" />
            <img src="images/wWBTC.png" alt="token-icon" />
          {:else}
            <img src="images/crDAO.png" alt="token-icon" />
          {/if}
        </div>
        <div>
          <a
            href={`https://better-call.dev/mainnet/${data.address}/operations`}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {#if farm.farmId == 0}
              Crunchy Farm XTZ/CRUNCH
            {:else if farm.farmId == 1}
              Crunchy Farm XTZ/kUSD
            {:else if farm.farmId == 2}
              Crunchy Farm XTZ/wWBTC
            {:else}
              {data.alias}
            {/if}
          </a>
        </div>
        <div>{farm.amount / 10 ** data.decimals}</div>
        <div>
          {#if farm.farmId == 0 && $store.tokensExchangeRates.CRUNCH}
            {+calcTotalShareValueInTez(
              farm.amount,
              farm.shareValueInTez,
              $store.tokensExchangeRates.CRUNCH.tokenToTez,
              $store.tokens.CRUNCH.decimals
            ).toFixed(5) / 1}
          {:else if farm.farmId == 1 && $store.tokensExchangeRates.kUSD}
            {+calcTotalShareValueInTez(
              farm.amount,
              farm.shareValueInTez,
              $store.tokensExchangeRates.KUSD.tokenToTez,
              $store.tokens.KUSD.decimals
            ).toFixed(5) / 1}
          {:else if farm.farmId == 2 && $store.tokensExchangeRates.wWBTC}
            {+calcTotalShareValueInTez(
              farm.amount,
              farm.shareValueInTez,
              $store.tokensExchangeRates.wWBTC.tokenToTez,
              $store.tokens.wWBTC.decimals
            ).toFixed(5) / 1}
          {:else}
            --
          {/if}
        </div>
        <div>--</div>
      {/if}
    {/each}
  {:else if platform === "wxtz"}
    <div class="icon">
      <img src={`images/wXTZ.png`} alt="token-icon" />
    </div>
    <div>
      <a
        href={`https://better-call.dev/mainnet/${data}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {shortenHash(data)}
      </a>
    </div>
    <div>
      {#await $store.Tezos.tz.getBalance(data)}
        <span class="material-icons"> hourglass_empty </span>
      {:then value}
        <span class:blurry-text={$store.blurryBalances}>
          {+value / 10 ** 6}
        </span> ꜩ
      {:catch error}
        Error
      {/await}
    </div>
  {:else if platform === "paul"}
    <div class="icon">
      {#each data.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
    <div>
      <a
        href={`https://better-call.dev/mainnet/${data.address}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {data.alias}
      </a>
    </div>
    <div>
      <span class:blurry-text={$store.blurryBalances}>
        {+(data.balance / 10 ** data.decimals).toFixed(5) / 1}
      </span>
    </div>
    <div>
      {#if data.id === "PAUL-PAUL"}
        <span class:blurry-text={$store.blurryBalances}>
          {+(
            ($store.tokensExchangeRates.PAUL.tokenToTez * data.balance) /
            10 ** data.decimals
          ).toFixed(5) / 1}
        </span>
      {:else}
        --
      {/if}
    </div>
    <div>
      {#if !rewards || harvestingPaul}
        <span class="material-icons"> hourglass_empty </span>
      {:else}
        {+rewards.amount.toFixed(5) / 1}
      {/if}
    </div>
    <div>
      {#if harvestingPaul}
        <button class="button investments loading">
          <span class="material-icons"> sync </span>
        </button>
      {:else if harvestingPaulSuccess === true}
        <button class="button main success">
          <span class="material-icons"> thumb_up </span>
        </button>
      {:else if harvestingPaulSuccess === false}
        <button class="button main error" on:click={harvestPaul}>
          Retry
        </button>
      {:else}
        <button class="button investments" on:click={harvestPaul}>
          <span class="material-icons"> agriculture </span>
        </button>
      {/if}
      <button
        class="button investments"
        on:click={() => {
          toastStore.addToast({
            type: "info",
            text: "Coming soon!",
            dismissable: false
          });
        }}
      >
        <span class="material-icons"> settings </span>
      </button>
    </div>
  {:else if platform === "kdao"}
    <div class="icon">
      {#each data.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
    <div>
      <a
        href={`https://better-call.dev/mainnet/${data.address}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {data.alias}
      </a>
    </div>
    <div>
      <span class:blurry-text={$store.blurryBalances}>
        {+(data.balance / 10 ** data.decimals).toFixed(5) / 1}
      </span>
    </div>
    <div>
      {#if data.id === "KUSD-KDAO"}
        <span class:blurry-text={$store.blurryBalances}>
          {+(
            ($store.tokensExchangeRates.kUSD.tokenToTez * data.balance) /
            10 ** data.decimals
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
        <button class="button investments loading">
          <span class="material-icons"> sync </span>
        </button>
      {:else if harvestingKdaoSuccess === true}
        <button class="button main success">
          <span class="material-icons"> thumb_up </span>
        </button>
      {:else if harvestingKdaoSuccess === false}
        <button class="button main error" on:click={harvestKdao}>
          Retry
        </button>
      {:else}
        <button class="button investments" on:click={harvestKdao}>
          <span class="material-icons"> agriculture </span>
        </button>
      {/if}
      <button
        class="button investments"
        on:click={() => {
          toastStore.addToast({
            type: "info",
            text: "Coming soon!",
            dismissable: false
          });
        }}
      >
        <span class="material-icons"> settings </span>
      </button>
    </div>
  {:else if platform === "lqt"}
    <div class="lbt-symbol">LB</div>
    <div>
      <span class:blurry-text={$store.blurryBalances}>
        {(+data.balance).toLocaleString("en-US")}
      </span>
    </div>
    <div>
      <span class:blurry-text={$store.blurryBalances}>
        {+data.xtz.toFixed(5) / 1}
      </span>
    </div>
    <div>
      <span class:blurry-text={$store.blurryBalances}>
        {+data.tzbtc.toFixed(8) / 1}
      </span>
    </div>
    <div>
      {(
        ($store.liquidityBaking.balance / $store.liquidityBaking.lqtTotal) *
        100
      ).toFixed(5)} %
    </div>
  {/if}
</div>
