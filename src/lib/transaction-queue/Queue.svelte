<script lang="ts">
  import { fly } from "svelte/transition";
  import queueStore from "./queue-store";
  import Modal from "../modal/Modal.svelte";

  let showModal = false;
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .queue-menu {
    position: absolute;
    top: 0px;
    right: 0px;
    background-color: $cyber-yellow;
    padding: 20px;
    border-radius: 0px;
    border-bottom-left-radius: 100%;
    border: solid 4px transparent;
    transition: border-bottom-color 1s;

    span.material-symbols-outlined {
      margin: 0px;
      margin-top: -10px;
      margin-right: -10px;
      font-size: 32px;
    }

    &:hover {
      border-bottom-color: darken($cyber-yellow, 10);
    }

    &.active::after {
      content: var(--queue-length);
      position: absolute;
      top: 5px;
      right: 5px;
      border-radius: 50%;
      font-weight: bold;
    }
  }
</style>

{#if $queueStore.queue.length > 0}
  <button
    class="queue-menu active"
    style={`--queue-length: "${$queueStore.queue.length}"`}
    transition:fly={{ duration: 500, x: 100 }}
    on:click={() => {
      showModal = !showModal;
    }}
  >
    <span class="material-symbols-outlined"> receipt_long </span>
  </button>
{/if}
{#if showModal}
  <Modal
    type="tx-queue"
    platform={undefined}
    action={undefined}
    payload={undefined}
    on:close={() => (showModal = false)}
  />
{/if}
