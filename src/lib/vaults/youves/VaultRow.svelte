<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { VaultData } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";

  export let vault: VaultData;

  const dispatch = createEventDispatcher();
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
    <img src={`tokens/uUSD.png`} alt="vault-icon" />
  </div>
  <div class="user-info">
    <div>
      <div>XTZ locked</div>
      {#if vault.xtzLocked}
        <div>
          <b>{formatTokenAmount(vault.xtzLocked / 10 ** 6)} ꜩ</b>
        </div>
        <div>
          {formatTokenAmount(
            (+vault.xtzLocked / 10 ** 6) * $store.xtzExchangeRate,
            2
          )} USD
        </div>
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
      {#if vault.borrowed}
        <div>
          <b
            >{formatTokenAmount(
              vault.borrowed / 10 ** $store.tokens.uUSD.decimals,
              3
            )} uUSD</b
          >
        </div>
        <div>
          {formatTokenAmount(
            (vault.borrowed / 10 ** $store.tokens.uUSD.decimals) *
              $store.tokens.uUSD.getExchangeRate()
          )} ꜩ
        </div>
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
