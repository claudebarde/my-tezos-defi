<script lang="ts">
  import { afterUpdate, createEventDispatcher } from "svelte";
  import { slide } from "svelte/transition";
  import type { Option } from "@swan-io/boxed";
  import type { InvestmentData, AvailableToken } from "../../types";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";

  export let invData: InvestmentData,
    stake: number,
    stakeInXtz: number,
    rewards: Option<number>;

  const dispatch = createEventDispatcher();
  let localRewards = 0;

  afterUpdate(() => {
    rewards.match({
      None: () => (localRewards = 0),
      Some: rw => (localRewards = rw)
    });
  });
</script>

<div class="farm-row-mini" in:slide|local={{ duration: 500 }}>
  <div class="icons">
    {#each invData.icons as icon}
      <img src={`tokens/${icon}.png`} alt="farm-token-icon" />
    {/each}
  </div>
  <div class="user-info">
    <div>
      <div class="bold">
        {formatTokenAmount(stake)} LPT
      </div>
    </div>
    <div>{formatTokenAmount(stakeInXtz)} ꜩ</div>
    <div>
      {formatTokenAmount(stakeInXtz * $store.xtzExchangeRate, 2)} USD
    </div>
  </div>
  <div>
    <div>Rewards</div>
    {#if invData.platform === "smartlink"}
      <div>Coming soon!</div>
    {:else if !isNaN(localRewards)}
      <div class="bold">
        {formatTokenAmount(localRewards)}
        {invData.rewardToken}
      </div>
      <div style="font-size: 0.8rem">
        ({formatTokenAmount(
          localRewards * $store.tokens[invData.rewardToken].getExchangeRate(),
          2
        )}
        ꜩ / {formatTokenAmount(
          localRewards *
            $store.tokens[invData.rewardToken].getExchangeRate() *
            $store.xtzExchangeRate,
          2
        )} USD)
      </div>
    {:else if rewards.isNone()}
      <div>No reward</div>
    {/if}
  </div>
  <div class="buttons">
    <button class="primary" on:click={() => dispatch("harvest")}>
      <span class="material-icons-outlined"> agriculture </span>
      Harvest
    </button>
  </div>
  <div>
    <button
      class="transparent"
      style="float:right"
      on:click={() => dispatch("expand")}
    >
      <span class="material-icons-outlined" style="margin:0px">
        expand_more
      </span>
    </button>
  </div>
</div>
