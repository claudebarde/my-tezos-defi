<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import queueStore from "$lib/transaction-queue/queue-store";
  import type { QueuedTx } from "../../types";
  import store from "../../store";

  let queue: Array<QueuedTx> = [];
  const dispatch = createEventDispatcher();

  const batchTransactions = async () => {
    if (queue.length === 0) return;

    try {
      const batch = $store.Tezos.wallet.batch([
        ...queue.map(tx => ({ ...tx.tx }))
      ]);
      const batchOp = await batch.send();
      await batchOp.confirmation();
    } catch (error) {
      console.error(error);
    }
  };

  onMount(() => {
    queue = [...$queueStore.queue];
  });
</script>

<style lang="scss">
  .transaction-list {
    p {
      padding: 10px;
    }
  }
</style>

<div class="modal-header">Transaction Queue</div>
{#if $queueStore.queue.length > 0}
  <div class="modal-body">
    <div>
      You have {$queueStore.queue.length} transaction{$queueStore.queue.length >
      1
        ? "s"
        : ""} in the queue:
    </div>
    <div class="transaction-list">
      {#each $queueStore.queue as tx, index (tx.id)}
        <p>
          <span>- {index + 1}</span>
          <input
            type="checkbox"
            checked={!!queue.find(_tx => _tx.id === tx.id)}
            on:change={() => {
              if (!!queue.find(_tx => _tx.id === tx.id)) {
                // if transaction is in the local queue, it is removed
                queue = [...queue.filter(_tx => _tx.id !== tx.id)];
              } else {
                // if transaction is not in the local queue, it is added
                queue = [...queue, tx];
              }
            }}
          />
          <span>{tx.description}</span>
        </p>
      {/each}
    </div>
  </div>
  <div class="modal-footer">
    <button
      class="primary"
      on:click={() => {
        queueStore.emptyQueue();
        dispatch("close");
      }}
    >
      Empty queue
    </button>
    <button
      class="primary"
      on:click={batchTransactions}
      disabled={queue.length === 0}
    >
      Send transaction{$queueStore.queue.length > 1 ? "s" : ""}
    </button>
  </div>
{:else}
  <div class="modal-body">No transaction in the queue</div>
{/if}
