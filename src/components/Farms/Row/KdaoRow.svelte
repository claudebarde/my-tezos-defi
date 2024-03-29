<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import BigNumber from "bignumber.js";
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
  import { computeLpTokenPrice } from "../../../tokenUtils/youvesUtils";

  export let rewards: {
      id: AvailableInvestments;
      platform: string;
      amount: number;
    },
    invData: InvestmentData,
    invName: AvailableInvestments,
    // valueInXtz: boolean,
    collapsed: boolean,
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
        {invData.id === "KUSD-KDAO" ? "kUSD" : "LPT"}
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
            {invData.alias}
          </a>
        </div>
      </div>
    </div>
    <div class="farm-block__data">
      <div class="farm-block__data__info">
        <span class="title">Stake:</span>
        <br />
        <div class:blurry-text={$store.blurryBalances}>
          {+(invData.balance / 10 ** invData.decimals).toFixed(5) / 1}
          {invData.id === "KUSD-KDAO" ? "kUSD" : "LPT"}
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
{/if}
