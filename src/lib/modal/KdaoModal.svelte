<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { OpKind, type WalletParamsWithKind } from "@taquito/taquito";
  import { Option, AsyncData } from "@swan-io/boxed";
  import type { OvenClient } from "@hover-labs/kolibri-js";
  import BigNumber from "bignumber.js";
  import type { modalAction, VaultData } from "../../types";
  import store from "../../store";
  import pillStore, {
    PillTextType,
    PillBehavior,
    PillShape
  } from "../pill/pillStore";
  import { formatTokenAmount } from "../../utils";
  // import queueStore from "../transaction-queue/queue-store";

  export let action: modalAction,
    payload: { ovenClient: OvenClient; vault: VaultData };

  let selectedAction = action;
  let borrowAmount: number | null = null;
  let payBackAmount: number | null = null;
  let withdrawAmount: number | null = null;
  let depositAmount: Option<number> = Option.None();
  let loading = AsyncData.NotAsked<boolean>();

  const dispatch = createEventDispatcher();

  $: enableTransaction = () => {
    if (selectedAction === "borrow" && borrowAmount) {
      return false;
    } else if (selectedAction === "payBack" && payBackAmount) {
      return false;
    } else if (selectedAction === "deposit" && depositAmount) {
      return false;
    } else if (selectedAction === "withdraw" && withdrawAmount) {
      return false;
    } else if (loading.isLoading()) {
      return false;
    } else {
      return true;
    }
  };

  const forgeTransaction = async (): Promise<
    Option<Array<{ tx: WalletParamsWithKind; description: string }>>
  > => {
    const contract = await $store.Tezos.wallet.at(payload.vault.address);

    if (selectedAction === "borrow" && borrowAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            ...contract.methods
              .borrow(borrowAmount * 10 ** $store.tokens.kUSD.decimals)
              .toTransferParams()
          },
          description: `Borrow ${borrowAmount} kUSD from kDAO oven`
        }
      ]);
    } else if (selectedAction === "payBack" && payBackAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            ...contract.methods
              .repay(payBackAmount * 10 ** $store.tokens.kUSD.decimals)
              .toTransferParams()
          },
          description: `Repay ${payBackAmount} kUSD from kDAO oven`
        }
      ]);
    } else if (selectedAction === "deposit" && depositAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            amount: depositAmount.getWithDefault(0) * 10 ** 6,
            ...contract.methods.default([["unit"]]).toTransferParams()
          },
          description: `Deposit ${depositAmount} XTZ in kDAO oven`
        }
      ]);
    } else if (selectedAction === "withdraw" && withdrawAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            ...contract.methods
              .withdraw(withdrawAmount * 10 ** 6)
              .toTransferParams()
          },
          description: `Withdraw ${withdrawAmount} XTZ from kDAO oven`
        }
      ]);
    } else {
      return Option.None();
    }
  };

  const updateDepositAmount = ev => {
    const val = +ev.target.value;
    if (!isNaN(val) && val !== 0) {
      depositAmount = Option.Some(val);
    } else {
      depositAmount = Option.None();
    }
  };

  const deposit = async () => {
    loading = AsyncData.Loading();
    const amount = depositAmount.match<number | null>({
      None: () => null,
      Some: v => v
    });

    try {
      if (!amount) throw "No amount";

      pillStore.update({
        text: `Depositing ${amount} XTZ`,
        type: PillTextType.WAIT_CONF,
        newShape: PillShape.LARGE,
        noTimeout: true
      });

      const op = await payload.ovenClient.deposit(
        new BigNumber(amount).times(10 ** 6)
      );
      await op.confirmation();

      pillStore.update({
        text: `${amount} XTZ deposited!`,
        type: PillTextType.SUCCESS,
        newShape: PillShape.LARGE,
        force: true
      });

      depositAmount = Option.None<number>();
      dispatch("deposit");
      loading = AsyncData.Done(true);
    } catch (error) {
      console.error(error);
      pillStore.update({
        text: "An error has occurred",
        type: PillTextType.ERROR,
        behavior: PillBehavior.SHAKING_TOP,
        newShape: PillShape.LARGE,
        force: true
      });
      loading = AsyncData.Done(false);
    } finally {
      // resets loading state
      setTimeout(() => {
        loading = AsyncData.NotAsked();
      }, 3000);
    }
  };

  const addToQueue = async () => {
    pillStore.update({
      text: "Coming soon!",
      type: PillTextType.COMING_SOON,
      behavior: PillBehavior.SHAKING_TOP
    });
    // const tx = await forgeTransaction();
    // tx.match({
    //   None: () => undefined,
    //   Some: txs => queueStore.addToQueue(txs)
    // });
  };
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .vault-nav {
    list-style-type: none;
    margin: 0px;
    padding: 0px;
    background-color: $light-cyan;

    li {
      display: inline;
      background-color: $light-cyan;
      padding: 10px;

      button {
        display: inline;
        background-color: transparent;
        border: none;
        font-size: 1rem;
      }

      &.selected {
        background-color: $sky-blue-crayola;
      }
    }
  }
</style>

<div class="modal-header">
  <ul class="vault-nav">
    <li class:selected={selectedAction === "borrow"}>
      <button
        on:click={() => (selectedAction = "borrow")}
        disabled={loading.isLoading()}
      >
        Borrow kUSD
      </button>
    </li>
    <li class:selected={selectedAction === "payBack"}>
      <button
        on:click={() => (selectedAction = "payBack")}
        disabled={loading.isLoading()}
      >
        Pay back kUSD
      </button>
    </li>
    <li class:selected={selectedAction === "withdraw"}>
      <button
        on:click={() => (selectedAction = "withdraw")}
        disabled={loading.isLoading()}
      >
        Withdraw ꜩ
      </button>
    </li>
    <li class:selected={selectedAction === "deposit"}>
      <button
        on:click={() => (selectedAction = "deposit")}
        disabled={loading.isLoading()}
      >
        Deposit ꜩ
      </button>
    </li>
  </ul>
</div>
<div class="modal-body">
  {#if selectedAction === "borrow"}
    <label>
      <span>Amount to borrow:</span>
      <input type="number" bind:value={borrowAmount} />
      <span>kUSD</span>
    </label>
  {:else if selectedAction === "payBack"}
    <label>
      <span>Amount to pay back:</span>
      <input type="number" bind:value={payBackAmount} />
      <span>kUSD</span>
    </label>
  {:else if selectedAction === "deposit"}
    <label class="baseline" for="deposit-amount-input">
      <span>Amount to deposit:</span>
      <div class="input-with-max">
        <div class="input-container">
          <input
            id="deposit-amount-input"
            type="number"
            value={depositAmount.match({
              None: () => "",
              Some: val => val.toString()
            })}
            disabled={loading.isLoading()}
            on:input={updateDepositAmount}
          />
        </div>
        <button
          class="transparent mini"
          disabled={loading.isLoading()}
          on:click={() =>
            updateDepositAmount({
              target: { value: formatTokenAmount($store.userBalance / 10 ** 6) }
            })}
        >
          max: {formatTokenAmount($store.userBalance / 10 ** 6)} XTZ
        </button>
      </div>
      <span>XTZ</span>
    </label>
  {:else if selectedAction === "withdraw"}
    <label>
      <span>Amount to withdraw:</span>
      <input type="number" bind:value={withdrawAmount} />
      <span>XTZ</span>
    </label>
  {/if}
</div>
<div class="modal-footer">
  <div />
  <div class="buttons">
    <button
      class="primary"
      disabled={enableTransaction()}
      on:click={addToQueue}
    >
      Add to queue
    </button>
    {#if selectedAction === "borrow"}
      <button class="primary" disabled={enableTransaction()}>Borrow</button>
    {:else if selectedAction === "payBack"}
      <button class="primary" disabled={enableTransaction()}>Pay Back</button>
    {:else if selectedAction === "deposit"}
      <button class="primary" disabled={enableTransaction()} on:click={deposit}>
        {#if loading.isDone()}
          {loading.get() ? "Deposited!" : "Error"}
        {:else if loading.isLoading()}
          <span class="material-icons-outlined loading"> hourglass_empty </span>
          Depositing...
        {:else}
          Deposit
        {/if}
      </button>
    {:else if selectedAction === "withdraw"}
      <button class="primary" disabled={enableTransaction()}>Withdraw</button>
    {/if}
  </div>
</div>
