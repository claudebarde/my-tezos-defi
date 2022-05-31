<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";

  export let totalRewards: Array<number>, name: string, harvestingAll: boolean;

  const dispatch = createEventDispatcher();
</script>

<div class="farm-header">
  <h3>{name} farms</h3>
  <div>
    {#if name.toLowerCase() === "plenty" && $store.tokens}
      1 PLENTY = {formatTokenAmount($store.tokens.PLENTY.getExchangeRate())} ꜩ
    {:else if name.toLowerCase() === "kolibri" && $store.tokens}
      1 kDAO = {formatTokenAmount($store.tokens.kDAO.getExchangeRate())} ꜩ
    {:else if name.toLowerCase() === "youves" && $store.tokens}
      1 YOU = {formatTokenAmount($store.tokens.YOU.getExchangeRate())} ꜩ
    {:else if name.toLowerCase() === "quipuswap" && $store.tokens}
      1 QUIPU = {formatTokenAmount($store.tokens.QUIPU.getExchangeRate())} ꜩ
    {/if}
  </div>
  <div class="farm-header__right">
    <div style="margin-right: 20px">
      Total rewards: {formatTokenAmount(
        [0, 0, ...totalRewards].reduce((a, b) => a + b)
      )} ꜩ
    </div>
    {#if harvestingAll}
      <button class="primary mini" disabled>
        <span class="material-icons-outlined loading"> hourglass_empty </span>
        Harvesting all
      </button>
    {:else}
      <button class="primary mini" on:click={() => dispatch("harvest-all")}>
        <span class="material-icons-outlined"> agriculture </span>
        Harvest all
      </button>
    {/if}
  </div>
</div>
