<script lang="ts">
  import { onMount, afterUpdate, createEventDispatcher } from "svelte";
  import tippy from "tippy.js";
  import { InvestmentData, AvailableInvestments } from "../../../types";
  import { AvailableToken } from "../../../types";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { loadInvestment, prepareOperation } from "../../../utils";
  import toastStore from "../../Toast/toastStore";

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
  let compounding = false;
  let compoundingSuccess = undefined;
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
        tokenSymbol: AvailableToken.WRAP
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
          text: `Successfully harvested ${rewardsToHarvest} WRAP!`,
          dismissable: false
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
        text: "Couldn't harvest WRAP tokens",
        dismissable: false
      });
    } finally {
      harvesting = false;
    }
  };

  const compound = async () => {
    compounding = true;
    try {
      const rewardsToHarvest = +rewards.amount.toFixed(3) / 1;
      const tokensToCompound = Math.floor(
        rewards.amount * 10 ** $store.tokens.WRAP.decimals
      );
      const contract = await $store.Tezos.wallet.at(invData.address);
      const wrapTokenContract = await $store.Tezos.wallet.at(
        $store.tokens.WRAP.address
      );

      const batch = prepareOperation({
        contractCalls: [
          contract.methods.claim([["unit"]]),
          wrapTokenContract.methods.update_operators([
            {
              add_operator: {
                owner: $store.userAddress,
                operator: invData.address,
                token_id: 0
              }
            }
          ]),
          contract.methods.stake(tokensToCompound),
          wrapTokenContract.methods.update_operators([
            {
              remove_operator: {
                owner: $store.userAddress,
                operator: invData.address,
                token_id: 0
              }
            }
          ])
        ],
        amount: +rewards.amount,
        tokenSymbol: AvailableToken.WRAP
      });
      const batchOp = await batch.send();
      await batchOp.confirmation();
      const opStatus = await batchOp.status();
      if (opStatus === "applied") {
        compoundingSuccess = true;
        dispatch("reset-rewards", invData.id);
        dispatch("update-stake", {
          id: invData.id,
          balance: +invData.balance + +tokensToCompound
        });
        toastStore.addToast({
          type: "success",
          text: `Successfully harvested and restaked ${rewardsToHarvest} WRAP!`,
          dismissable: false
        });
        setTimeout(() => {
          compoundingSuccess = undefined;
        }, 2000);
      } else {
        compoundingSuccess = false;
        throw `Error when applying operation: _${opStatus}_`;
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        text: "Couldn't harvest WRAP tokens",
        dismissable: false
      });
    } finally {
      compounding = false;
    }
  };

  onMount(async () => {
    tippy(`#farm-${invData.id}`, {
      content: createTooltipContent(invData),
      allowHTML: true
    });

    tippy(`#harvest-${invData.id}`, {
      content: "Harvest"
    });

    tippy(`#remove-${invData.id}`, {
      content: "Remove"
    });

    if (invData.id === AvailableInvestments["WRAP-STACKING"]) {
      tippy(`#harvest-restake-${invData.id}`, {
        content: "Harvest and restake"
      });
    }

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
  });

  afterUpdate(() => {
    if (rewards && rewards.amount && invData.platform === "wrap") {
      tippy(`#rewards-${invData.id}`, {
        content: `<div>${
          +(
            rewards.amount * $store.tokens[AvailableToken.WRAP].exchangeRate
          ).toFixed(5) / 1
        } ꜩ<br />${
          +(
            rewards.amount *
            $store.tokens[AvailableToken.WRAP].exchangeRate *
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
      <button class="mini" on:click={harvest} id={`harvest-${invData.id}`}>
        <span class="material-icons"> agriculture </span>
      </button>
    {/if}
    {#if invData.id === AvailableInvestments["WRAP-STACKING"]}
      {#if compounding}
        <button class="mini loading">
          <span class="material-icons"> sync </span>
        </button>
      {:else if compoundingSuccess === true}
        <button class="mini success">
          <span class="material-icons"> thumb_up </span>
        </button>
      {:else if compoundingSuccess === false}
        <button class="mini error" on:click={compound}> Retry </button>
      {:else}
        <button
          class="mini"
          on:click={compound}
          id={`harvest-restake-${invData.id}`}
        >
          <span class="material-icons"> save_alt </span>
        </button>
      {/if}
    {/if}
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <button class="mini">
        <span class="material-icons"> settings </span>
      </button>
    {/if}
  </div>
</div>
