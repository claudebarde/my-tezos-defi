<script lang="ts">
  import { fly } from "svelte/transition";
  import { expoInOut } from "svelte/easing";
  import toastStore from "./toastStore";
</script>

<style lang="scss">
  .toast {
    padding: 10px 30px;
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 5px;
    height: 25px;
    min-width: 20%;
    text-align: center;
    color: white;
    z-index: 999;

    &.default {
      background-color: #4b5563;
    }
    &.info {
      background-color: #2563eb;
    }
    &.success {
      background-color: #059669;
    }
    &.error {
      background-color: #dc2626;
    }
  }
</style>

{#each $toastStore as toast, index (toast.id)}
  <div
    class={`toast ${toast.type}`}
    transition:fly={{ y: 300, duration: 1000, easing: expoInOut }}
    style={"bottom:" + (index === 0 ? "50px" : 50 + 60 * index + "px")}
  >
    {toast.text}
    {#if toast.dismissable}
      <span
        class="material-icons"
        style="cursor:pointer;vertical-align:middle;float:right"
        on:click={() => toastStore.removeToast(toast.id)}
      >
        close
      </span>
    {/if}
  </div>
{/each}
