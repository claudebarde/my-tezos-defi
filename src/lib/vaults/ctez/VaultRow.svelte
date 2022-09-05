<script lang="ts">
  import type { VaultData, modalAction } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import Modal from "../../modal/Modal.svelte";

  export let vault: VaultData;

  let showModal = false;
  let modalAction: modalAction;
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

<div class="vault-row">
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
    <img src={`tokens/Ctez.png`} alt="vault-icon" />
  </div>
  <div class="user-info">
    <div>
      <div>XTZ locked</div>
      {#if vault.xtzLocked || vault.xtzLocked === 0}
        <div class:blurry-text={$store.blurryBalances}>
          <b>{formatTokenAmount(vault.xtzLocked / 10 ** 6)} ꜩ</b>
        </div>
        <div class:blurry-text={$store.blurryBalances}>
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
      {#if vault.borrowed || vault.borrowed === 0}
        <div class:blurry-text={$store.blurryBalances}>
          <b
            >{formatTokenAmount(
              vault.borrowed / 10 ** $store.tokens.ctez.decimals,
              3
            )} Ctez</b
          >
        </div>
        <div class:blurry-text={$store.blurryBalances}>
          {formatTokenAmount(
            (vault.borrowed / 10 ** $store.tokens.ctez.decimals) *
              $store.tokens.uUSD.getExchangeRate()
          )} ꜩ
        </div>
      {:else}
        <div><span>---</span></div>
        <div>&nbsp;</div>
      {/if}
    </div>
    <div class="buttons">
      <button
        class="primary mini"
        on:click={() => {
          modalAction = "borrow";
          showModal = true;
        }}
      >
        Borrow
      </button>
      <button
        class="primary mini"
        on:click={() => {
          modalAction = "payBack";
          showModal = true;
        }}
      >
        Pay back
      </button>
      <button
        class="primary mini"
        on:click={() => {
          modalAction = "withdraw";
          showModal = true;
        }}
      >
        Withdraw ꜩ
      </button>
      <button
        class="primary mini"
        on:click={() => {
          modalAction = "deposit";
          showModal = true;
        }}
      >
        Deposit ꜩ
      </button>
    </div>
  {/if}
</div>
{#if showModal}
  <Modal
    type="vault"
    platform="ctez"
    action={modalAction}
    payload={{ vault }}
    on:close={() => (showModal = false)}
  />
{/if}
