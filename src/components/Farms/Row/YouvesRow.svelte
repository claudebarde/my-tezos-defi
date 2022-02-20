<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import {
    InvestmentData,
    AvailableInvestments,
    AvailableToken
  } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { loadInvestment, formatTokenAmount } from "../../../utils";
  import config from "../../../config";
  import {
    computeLpTokenPrice,
    longTermFarmFullRewards
  } from "../../../tokenUtils/youvesUtils";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments,
    collapsed: boolean;
  // valueInXtz: boolean,

  let harvesting = false;
  let harvestingSuccess = undefined;
  let stakeInXtz: null | number = null;
  const dispatch = createEventDispatcher();
  let token1: AvailableToken;
  let token2: AvailableToken;
  let token1Value: null | number = null;
  let token2Value: null | number = null;
  let totalSupply: { inToken: number; inTez: number };
  let longTermRewards: number;

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

      if (invData.id === AvailableInvestments["YOUVES-UUSD-UBTC"]) {
        token1 = AvailableToken.uUSD;
        token2 = AvailableToken.uBTC;
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
            token1Value = token1Output.toNumber();
            token2Value = token2Output.toNumber();

            stakeInXtz =
              (token1Value / 10 ** $store.tokens.uUSD.decimals) *
                $store.tokens[token1].exchangeRate +
              (token2Value / 10 ** $store.tokens.uBTC.decimals) *
                $store.tokens[token2].exchangeRate;
          }
          // computes total supply value in XTZ
          const totalSupplyPrice = computeLpTokenPrice(
            total_supply,
            total_supply,
            token_a_pool,
            token_b_pool
          );
          if (totalSupplyPrice) {
            const { token1Output, token2Output } = totalSupplyPrice;
            totalSupply = {
              inToken: total_supply.toNumber(),
              inTez:
                (token1Output.toNumber() / 10 ** $store.tokens.uUSD.decimals) *
                  $store.tokens[token1].exchangeRate +
                (token2Output.toNumber() / 10 ** $store.tokens.uBTC.decimals) *
                  $store.tokens[token2].exchangeRate
            };
          }
          // computes the long term rewards
          const rewardsPoolContract = await $store.Tezos.wallet.at(
            invData.address
          );
          const rewardsPoolStorage: any = await rewardsPoolContract.storage();
          const stake = await rewardsPoolStorage.stakes.get($store.userAddress);
          const longTermRewards_ = longTermFarmFullRewards(
            rewardsPoolStorage.dist_factor,
            stake.stake.dividedBy(10 ** invData.decimals),
            stake.dist_factor,
            invData.decimals
          );
          if (longTermRewards_) {
            longTermRewards =
              longTermRewards_ / 10 ** $store.tokens.YOU.decimals;
          }
        }
      } else if (invData.id === AvailableInvestments["YOUVES-UUSD-WUSDC"]) {
        token1 = AvailableToken.uUSD;
        token2 = AvailableToken.wUSDC;
        const dexAddress = "KT1JeWiS8j1kic4PHx7aTnEr9p4xVtJNzk5b";
        const contract = await $store.Tezos.wallet.at(dexAddress);
        const storage: any = await contract.storage();
        const { cashPool, tokenPool, lqtTotal } = storage;
        const lptPrice = computeLpTokenPrice(
          invData.balance,
          lqtTotal,
          tokenPool,
          cashPool
        );
        if (lptPrice) {
          const { token1Output, token2Output } = lptPrice;
          token1Value = token1Output.toNumber();
          token2Value = token2Output.toNumber();
          stakeInXtz =
            (token1Value / 10 ** $store.tokens.uUSD.decimals) *
              $store.tokens[token1].exchangeRate +
            (token2Value / 10 ** $store.tokens.wUSDC.decimals) *
              $store.tokens[token2].exchangeRate;

          // computes total supply value in XTZ
          const totalSupplyPrice = computeLpTokenPrice(
            lqtTotal,
            lqtTotal,
            tokenPool,
            cashPool
          );
          if (totalSupplyPrice) {
            const { token1Output, token2Output } = totalSupplyPrice;
            totalSupply = {
              inToken: lqtTotal.toNumber(),
              inTez:
                (token1Output.toNumber() / 10 ** $store.tokens.uUSD.decimals) *
                  $store.tokens[token1].exchangeRate +
                (token2Output.toNumber() / 10 ** $store.tokens.wUSDC.decimals) *
                  $store.tokens[token2].exchangeRate
            };
          }
        }
      }
    }

    dispatch("update-farm-value", [invName, stakeInXtz]);
  });
</script>

{#if collapsed}
  <div class="collapsed-farm-row">
    <div class="icons">
      {#each invData.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
    <div class:blurry-text={$store.blurryBalances}>
      <div class="title">
        {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1}
        LPT
      </div>
      <div style="font-size:0.9rem">
        {#if stakeInXtz}
          ({`${formatTokenAmount(stakeInXtz, 2)} ꜩ / ${formatTokenAmount(
            stakeInXtz * $store.xtzData.exchangeRate,
            2
          )} ${$localStorageStore.preferredFiat}`})
        {/if}
      </div>
    </div>
    <div />
    <div>
      <div class="title">Rewards</div>
      <div style="font-size:0.9rem">
        {rewards ? formatTokenAmount(rewards.amount) : "---"}
        {invData.rewardToken}
      </div>
    </div>
    <div>
      <button class="mini">
        <span class="material-icons"> agriculture </span>
      </button>
    </div>
  </div>
{:else}
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
        {#if totalSupply}
          <br />
          <div style="font-size:0.7rem">
            <div>Total supply:</div>
            <div>
              {formatTokenAmount(totalSupply.inToken / 10 ** invData.decimals)} LPT
            </div>
            <div>
              {formatTokenAmount(totalSupply.inTez).toLocaleString("en-US")} ꜩ
            </div>
          </div>
        {/if}
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
          {#if token1Value && token2Value}
            <div style="font-size:0.8rem">
              ({formatTokenAmount(
                token1Value / 10 ** $store.tokens[token1].decimals
              )}
              {token1}
              +
            </div>
            <div style="font-size:0.8rem">
              {formatTokenAmount(
                token2Value / 10 ** $store.tokens[token2].decimals
              )}
              {token2})
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
      {#if invData.id === AvailableInvestments["YOUVES-UUSD-UBTC"] && longTermRewards}
        <div>
          <span class="title">Long term rewards:</span>
          <br />
          <span id={`longterm-rewards-${invData.id}`}>
            {formatTokenAmount(longTermRewards)}
            {$store.investments[invData.id].rewardToken}
          </span>
          <br />
          <span style="font-size:0.7rem">
            ({formatTokenAmount(
              longTermRewards * $store.tokens[invData.rewardToken].exchangeRate
            )} ꜩ / {formatTokenAmount(
              longTermRewards *
                $store.tokens[invData.rewardToken].exchangeRate *
                $store.xtzData.exchangeRate,
              2
            )}
            {config.validFiats.find(
              fiat => fiat.code === $localStorageStore.preferredFiat
            ).symbol})
          </span>
        </div>
        <br />
      {/if}
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
{/if}
