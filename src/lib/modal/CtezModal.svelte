<script lang="ts">
  import { OpKind, type WalletParamsWithKind } from "@taquito/taquito";
  import { Option } from "@swan-io/boxed";
  import type { modalAction, VaultData } from "../../types";
  import store from "../../store";
  import queueStore from "../transaction-queue/queue-store";

  export let action: modalAction, payload: { vault: VaultData };

  let selectedAction = action;
  let borrowAmount: number | null = null;
  let payBackAmount: number | null = null;
  let withdrawAmount: number | null = null;
  let depositAmount: number | null = null;

  $: enableTransaction = () => {
    if (selectedAction === "borrow" && borrowAmount) {
      return false;
    } else if (selectedAction === "payBack" && payBackAmount) {
      return false;
    } else if (selectedAction === "deposit" && depositAmount) {
      return false;
    } else if (selectedAction === "withdraw" && withdrawAmount) {
      return false;
    } else {
      return true;
    }
  };

  const forgeTransaction = async (): Promise<
    Option<Array<{ tx: WalletParamsWithKind; description: string }>>
  > => {
    const contract = await $store.Tezos.wallet.at(payload.vault.address);
    const storage: any = await contract.storage();
    const targetContractAddress = "KT1GWnsoFZVHGh7roXEER3qeCcgJgrXT3de2";
    const targetContract = await $store.Tezos.wallet.at(targetContractAddress);

    if (selectedAction === "borrow" && borrowAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            ...contract.methods
              .borrow(borrowAmount * 10 ** $store.tokens.kUSD.decimals)
              .toTransferParams()
          },
          description: `Borrow ${borrowAmount} Ctez from Ctez oven`
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
          description: `Repay ${payBackAmount} Ctez from Ctez oven`
        }
      ]);
    } else if (selectedAction === "deposit" && depositAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            amount: depositAmount * 10 ** 6,
            ...contract.methods.default([["unit"]]).toTransferParams()
          },
          description: `Deposit ${depositAmount} XTZ in Ctez oven`
        }
      ]);
    } else if (selectedAction === "withdraw" && withdrawAmount) {
      return Option.Some([
        {
          tx: {
            kind: OpKind.TRANSACTION,
            ...targetContract.methodsObject
              .withdraw({
                id: storage.handle.id,
                amount: withdrawAmount * 10 ** 6,
                to: storage.handle.owner
              })
              .toTransferParams()
          },
          description: `Withdraw ${withdrawAmount} XTZ from Ctez oven`
        }
      ]);
    } else {
      return Option.None();
    }
  };

  const addToQueue = async () => {
    const tx = await forgeTransaction();
    tx.match({
      None: () => undefined,
      Some: txs => queueStore.addToQueue(txs)
    });
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
    <li
      class:selected={selectedAction === "borrow"}
      on:click={() => (selectedAction = "borrow")}
    >
      <button>Borrow Ctez</button>
    </li>
    <li
      class:selected={selectedAction === "payBack"}
      on:click={() => (selectedAction = "payBack")}
    >
      <button>Pay back Ctez</button>
    </li>
    <li
      class:selected={selectedAction === "withdraw"}
      on:click={() => (selectedAction = "withdraw")}
    >
      <button>Withdraw ꜩ</button>
    </li>
    <li
      class:selected={selectedAction === "deposit"}
      on:click={() => (selectedAction = "deposit")}
    >
      <button>Deposit ꜩ</button>
    </li>
  </ul>
</div>
<div class="modal-body">
  {#if selectedAction === "borrow"}
    <label>
      <span>Amount to borrow:</span>
      <input type="number" bind:value={borrowAmount} />
      <span>Ctez</span>
    </label>
  {:else if selectedAction === "payBack"}
    <label>
      <span>Amount to pay back:</span>
      <input type="number" bind:value={payBackAmount} />
      <span>Ctez</span>
    </label>
  {:else if selectedAction === "deposit"}
    <label>
      <span>Amount to deposit:</span>
      <input type="number" bind:value={depositAmount} />
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
      <button class="primary" disabled={enableTransaction()}>Deposit</button>
    {:else if selectedAction === "withdraw"}
      <button class="primary" disabled={enableTransaction()}>Withdraw</button>
    {/if}
  </div>
</div>
