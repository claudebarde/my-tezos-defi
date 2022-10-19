<script lang="ts">
  import { onMount } from "svelte";
  import type { VaultData, AvailableToken } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import config from "../../../config";

  export let vault: VaultData;

  let tokens: Array<AvailableToken | string> = ["unknown-token"];

  onMount(() => {
    if (
      vault.hasOwnProperty("youvesEngineAddress") &&
      !!vault.youvesEngineAddress
    ) {
      const engine = Object.entries(config.youvesEngines).find(
        ([_, engine]) => engine.address === vault.youvesEngineAddress
      );
      if (engine) {
        tokens = [...engine[1].tokens];
      }
    }
  });
</script>

<style lang="scss">
  @import "../../../styles/settings.scss";

  .liquidated {
    background-color: $cyber-yellow;
  }

  .buttons {
    button {
      flex-basis: 40%;
    }
  }
</style>

<div class="vault-row" class:liquidated={vault.isLiquidated}>
  <div>
    <a
      href={`https://better-call.dev/mainnet/${vault.address}/operations`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="material-icons-outlined"> open_in_new </span>
    </a>
  </div>
  <div class="icons">
    {#each tokens as token}
      <img src={`tokens/${token}.png`} alt="vault-icon" />
    {/each}
  </div>
  <div class="user-info">
    <div>
      <div>XTZ locked</div>
      {#if vault.xtzLocked}
        <div class:blurry-text={$store.blurryBalances}>
          <b>{formatTokenAmount(vault.xtzLocked / 10 ** 6)} ꜩ</b>
        </div>
        {#if vault.xtzLocked > 0}
          <div class:blurry-text={$store.blurryBalances}>
            {formatTokenAmount(
              (+vault.xtzLocked / 10 ** 6) * $store.xtzExchangeRate,
              2
            )} USD
          </div>
        {/if}
      {:else}
        <div>---</div>
        <div>&nbsp;</div>
      {/if}
    </div>
  </div>
  {#if vault.isLiquidated}
    <div>Liquidated</div>
  {:else}
    <div>
      <div>Borrowed</div>
      {#if vault.borrowed && vault.borrowed > 0}
        <div class:blurry-text={$store.blurryBalances}>
          <b
            >{formatTokenAmount(
              vault.borrowed / 10 ** $store.tokens.uUSD.decimals,
              4
            )} uUSD</b
          >
        </div>
        <div class:blurry-text={$store.blurryBalances}>
          {formatTokenAmount(
            (vault.borrowed / 10 ** $store.tokens.uUSD.decimals) *
              $store.tokens.uUSD.getExchangeRate()
          )} ꜩ
        </div>
      {:else if vault.borrowed && vault.borrowed === 0}
        <div>0 uUSD</div>
      {:else}
        <div><span>---</span></div>
        <div>&nbsp;</div>
      {/if}
    </div>
    <div class="buttons">
      <button class="primary mini">Borrow</button>
      <button class="primary mini">Pay back</button>
      <button class="primary mini">Withdraw ꜩ</button>
      <button class="primary mini">Deposit ꜩ</button>
    </div>
  {/if}
</div>
