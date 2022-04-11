<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import BigNumber from "bignumber.js";
  import type { AvailableInvestment, InvestmentData } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import {
    formatTokenAmount,
    estimateQuipuTezInShares,
    estimateQuipuTokenInShares,
    getKdaoReward,
    prepareOperation
  } from "../../../utils";
  import { computeLpTokenPrice } from "../../../tokenUtils/youvesUtils";
  import config from "../../../config";
  import FarmMiniRow from "../FarmMiniRow.svelte";

  export let invName: AvailableInvestment;

  const dispatch = createEventDispatcher();
  let invData: InvestmentData;
  let stakeInXtz: null | number = null;
  let rewards = 0;
  let recalcInterval;
  let expand = false;
  let harvesting = false;
  let harvestingSuccess = false;

  const calcStake = async () => {
    if (invData.id === "KUSD-KDAO") {
      stakeInXtz =
        +(
          (invData.balance / 10 ** $store.tokens.kUSD.decimals) *
          $store.tokens.kUSD.exchangeRate
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
    } else if (invData.id === "KUSD-QL") {
      // Load kUSD Contract
      const kUSDContract = await $store.Tezos.wallet.at(
        $store.tokens.kUSD.address
      );
      const kUSDStorage: any = await kUSDContract.storage();

      // Load Liq Pool Contract
      const liqContract = await $store.Tezos.wallet.at(
        config.kusdLiquidityPoolAddress
      );
      const liqStorage: any = await liqContract.storage();

      // Get number of kUSD in the liquidity pool
      let poolBalance = await kUSDStorage.balances.get(
        config.kusdLiquidityPoolAddress
      );
      if (poolBalance === undefined) {
        poolBalance = new BigNumber(0);
      } else {
        poolBalance = poolBalance.balance;
      }

      // Get number of LP tokens outstanding
      const lpBalance = liqStorage.totalSupply;

      // Changed fixed point numbers into decimals
      const KUSD_MANTISSA = Math.pow(10, 18); // kUSD has 18 decimals
      const LP_MANTISSA = Math.pow(10, 36); // LP has 36 decimals
      const kUSDBalanceDecimal = poolBalance.dividedBy(KUSD_MANTISSA);
      const lpBalanceDecimal = lpBalance.dividedBy(LP_MANTISSA);

      // Calculate an exchange rate
      // toFixed() will give you n digits of precision
      const redeemRate = kUSDBalanceDecimal
        .dividedBy(lpBalanceDecimal)
        .toFixed(2);

      stakeInXtz = formatTokenAmount(
        +(invData.balance / 10 ** invData.decimals) *
          redeemRate *
          $store.tokens.kUSD.exchangeRate
      );
    } else if (invData.id === "KDAO-KUSD-UUSD") {
      const kUSDuUSDdexAddress = "KT1AVbWyM8E7DptyBCu4B5J5B7Nswkq7Skc6";
      const contract = await $store.Tezos.wallet.at(kUSDuUSDdexAddress);
      const storage: any = await contract.storage();
      const computedResult = computeLpTokenPrice(
        invData.balance,
        storage.lqtTotal,
        storage.cashPool,
        storage.tokenPool
      );
      if (computedResult) {
        // calculates stake in XTZ
        const token1ToXtz =
          (computedResult.token1Output.toNumber() /
            10 ** $store.tokens.kUSD.decimals) *
          $store.tokens.kUSD.exchangeRate;
        const token2ToXtz =
          (computedResult.token2Output.toNumber() /
            10 ** $store.tokens.uUSD.decimals) *
          $store.tokens.uUSD.exchangeRate;
        stakeInXtz = token1ToXtz + token2ToXtz;
      }
    }
  };

  const calcRewards = async () => {
    const rewardsRes = await getKdaoReward(
      invData.address,
      $store.userAddress,
      $store.currentLevel
    );
    if (rewardsRes) {
      rewards = rewardsRes.toNumber() / 10 ** $store.tokens.kDAO.decimals;
    }
    // converts rewards into XTZ
    dispatch("farm-update", {
      id: invData.id,
      balance: invData.balance,
      value: stakeInXtz,
      rewards: rewards * $store.tokens.kDAO.exchangeRate
    });
  };

  const harvest = async () => {
    harvesting = true;
    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const batch = prepareOperation({
        contractCalls: [contract.methods.claim([["unit"]])],
        amount: rewards,
        tokenSymbol: AvailableToken.kDAO
      });
      const op = await batch.send();
      await op.confirmation();
      harvesting = false;
      const opStatus = await op.status();
      if (opStatus === "applied") {
        harvestingSuccess = true;
        rewards = 0;
        /*toastStore.addToast({
          type: "success",
          title: "Success!",
          text: `Successfully harvested ${rewardsToHarvest} kDAO!`,
          dismissable: false,
          icon: "agriculture"
        });*/
        setTimeout(() => {
          harvestingSuccess = undefined;
        }, 2000);
      } else {
        harvestingSuccess = false;
        throw `Error when applying operation: _${opStatus}_`;
      }
    } catch (error) {
      console.log(error);
      /*toastStore.addToast({
        type: "error",
        title: "Harvest error",
        text: "Couldn't harvest PLENTY tokens",
        dismissable: false,
        icon: "agriculture"
      });*/
    } finally {
      harvesting = false;
    }
  };

  onMount(async () => {
    invData = $store.investments[invName];
    if (!invData.balance) {
      stakeInXtz = 0;
    } else {
      await calcRewards();
      await calcStake();
      recalcInterval = setInterval(async () => {
        await calcRewards();
        await calcStake();
      }, 60_000);
    }
  });

  onDestroy(() => {
    clearInterval(recalcInterval);
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
          <div>Rewards</div>
          <div class="bold">{formatTokenAmount(rewards)} kDAO</div>
          <div style="font-size: 0.8rem">
            ({formatTokenAmount(rewards * $store.tokens.kDAO.exchangeRate, 2)} ꜩ
            /
            {formatTokenAmount(
              rewards *
                $store.tokens.kDAO.exchangeRate *
                $store.xtzExchangeRate,
              2
            )} USD)
          </div>
        </div>
        <div>
          <div />
          <button class="primary" on:click={harvest}>
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
    <FarmMiniRow
      {invData}
      stake={invData.balance / 10 ** invData.decimals}
      {stakeInXtz}
      {rewards}
      rewardToken={AvailableToken.kDAO}
      on:expand={() => (expand = true)}
      on:harvest={harvest}
    />
  {/if}
{:else}
  <div>No data found for this farm</div>
{/if}
