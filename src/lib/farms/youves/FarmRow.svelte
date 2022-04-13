<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import type { InvestmentData } from "../../../types";
  import { AvailableToken, AvailableInvestment } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import {
    computeLpTokenPrice,
    longTermFarmFullRewards,
    getYouvesRewards
  } from "../../../tokenUtils/youvesUtils";
  import FarmMiniRow from "../FarmMiniRow.svelte";
  import Loader from "$lib/farms/Loader.svelte";

  export let invName: AvailableInvestment;

  const dispatch = createEventDispatcher();
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let rewards = 0;
  let token1: AvailableToken;
  let token2: AvailableToken;
  let token1Value: null | number = null;
  let token2Value: null | number = null;
  let totalSupply: { inToken: number; inTez: number };
  let longTermRewards: number;
  let fullRewardsAvailable: number;
  let stakingToken = "";
  let expand = false;

  const calcStake = async () => {
    if (invData.id === AvailableInvestment["YOUVES-UUSD-UBTC"]) {
      token1 = AvailableToken.uUSD;
      token2 = AvailableToken.uBTC;
      stakingToken = "LPT";
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
              $store.tokens[token1].getExchangeRate() +
            (token2Value / 10 ** $store.tokens.uBTC.decimals) *
              $store.tokens[token2].getExchangeRate();
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
                $store.tokens[token1].getExchangeRate() +
              (token2Output.toNumber() / 10 ** $store.tokens.uBTC.decimals) *
                $store.tokens[token2].getExchangeRate()
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
          longTermRewards = longTermRewards_ / 10 ** $store.tokens.YOU.decimals;
        }
        fullRewardsAvailable =
          Date.parse(stake.age_timestamp) + 180 * 24 * 60 * 60 * 1000;
      }
    } else if (invData.id === AvailableInvestment["YOUVES-UUSD-WUSDC"]) {
      token1 = AvailableToken.uUSD;
      token2 = AvailableToken.wUSDC;
      stakingToken = "LPT";
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
            $store.tokens[token1].getExchangeRate() +
          (token2Value / 10 ** $store.tokens.wUSDC.decimals) *
            $store.tokens[token2].getExchangeRate();

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
                $store.tokens[token1].getExchangeRate() +
              (token2Output.toNumber() / 10 ** $store.tokens.wUSDC.decimals) *
                $store.tokens[token2].getExchangeRate()
          };
        }
      }
    } else {
      stakingToken = "YOU";
      stakeInXtz =
        (invData.balance / 10 ** $store.tokens.YOU.decimals) *
        $store.tokens.YOU.getExchangeRate();
    }
    // converts rewards into XTZ
    dispatch("farm-update", {
      id: invData.id,
      balance: invData.balance,
      value: stakeInXtz,
      rewards: rewards * $store.tokens[invData.rewardToken].getExchangeRate()
    });
  };

  const calcRewards = async () => {
    rewards = await getYouvesRewards(
      $store.Tezos,
      invData,
      $store.userAddress,
      $store.tokens.YOU.decimals
    );
  };

  onMount(async () => {
    invData = $store.investments[invName];
    if (!invData.balance) {
      stakeInXtz = 0;
    } else {
      await calcRewards();
      await calcStake();
    }
  });
</script>

{#if invData && $store.tokens}
  {#if expand}
    <div class="farm-row" in:slide|local={{ duration: 500 }}>
      <div class="farm-info">
        <div class="icons">
          {#each invData.icons as icon}
            <img src={`tokens/${icon}.png`} alt="farm-token-icon" />
          {/each}
        </div>
        <div class="farm-info__link">
          <a
            href={`https://better-call.dev/mainnet/${invData.address}/operations`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {invData.alias}
          </a>
        </div>
        <div class="farm-info__tokens-price">
          {#each invData.icons as token}
            <div>
              1 {token} = {formatTokenAmount($store.tokens[token].exchangeRate)}
              ꜩ
            </div>
          {/each}
        </div>
      </div>
      <div class="user-info">
        <div>
          <div>Stake</div>
          <div class="bold">
            {formatTokenAmount(invData.balance / 10 ** invData.decimals)} LPT
          </div>
        </div>
        <div>
          <div>Value in XTZ</div>
          <div class="bold">{formatTokenAmount(stakeInXtz)} ꜩ</div>
        </div>
        <div>
          <div>Value in USD</div>
          <div class="bold">
            {formatTokenAmount(stakeInXtz * $store.xtzExchangeRate, 2)} USD
          </div>
        </div>
      </div>
      <div class="actions">
        <div>
          {#if invData.type === "long-term"}
            <div>Available rewards</div>
          {:else}
            <div>Rewards</div>
          {/if}
          <div class="bold">
            {formatTokenAmount(rewards)}
            {invData.rewardToken}
          </div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(
              rewards * $store.tokens.YOU.getExchangeRate(),
              2
            )} ꜩ /
            {formatTokenAmount(
              rewards *
                $store.tokens.YOU.getExchangeRate() *
                $store.xtzExchangeRate,
              2
            )} USD)
          </div>
          {#if invData.type === "long-term"}
            <div style="margin-top:15px">Long term rewards</div>
            <div class="bold">
              {formatTokenAmount(longTermRewards)}
              {invData.rewardToken}
            </div>
            <div style="font-size: 0.8rem">
              ({formatTokenAmount(
                longTermRewards * $store.tokens.YOU.getExchangeRate(),
                2
              )} ꜩ / {formatTokenAmount(
                longTermRewards *
                  $store.tokens.YOU.getExchangeRate() *
                  $store.xtzExchangeRate,
                2
              )} USD)
            </div>
          {/if}
        </div>
        <div>
          <div />
          <button class="primary">
            <span class="material-icons-outlined"> agriculture </span>
            Harvest
          </button>
        </div>
      </div>
      <div class="token-box_expand-less">
        <button class="transparent" on:click={() => (expand = !expand)}>
          <span class="material-icons-outlined" style="margin:0px">
            expand_less
          </span>
        </button>
      </div>
    </div>
  {:else}
    <!-- Loader-->
    {#if stakeInXtz && rewards}
      <FarmMiniRow
        {invData}
        stake={invData.balance / 10 ** invData.decimals}
        {stakeInXtz}
        {rewards}
        rewardToken={invData.rewardToken}
        on:expand={() => (expand = true)}
      />
    {:else}
      <Loader
        icons={invData.icons}
        stake={invData.balance / 10 ** invData.decimals}
      />
    {/if}
  {/if}
{:else}
  <div>No data found for this farm</div>
{/if}
