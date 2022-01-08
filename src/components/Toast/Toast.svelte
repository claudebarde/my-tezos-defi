<script lang="ts">
  import { fly } from "svelte/transition";
  import { expoInOut } from "svelte/easing";
  import toastStore from "./toastStore";
</script>

<style lang="scss">
  .toast {
    display: grid;
    grid-template-columns: 20% 80%;
    grid-gap: 20px;
    padding: 10px;
    position: fixed;
    right: 30px;
    border-radius: 5px;
    min-width: 25%;
    color: white;
    z-index: 999;

    &.default {
      background-color: #4b5563;
    }
    &.info {
      background-color: #2563eb;
    }
    &.success {
      background-color: #16a34a;
    }
    &.error {
      background-color: #dc2626;
    }

    .toast-icon {
      display: flex;
      justify-content: center;
      align-items: center;

      .material-icons {
        font-size: 40px;
      }

      img {
        width: 40px;
        height: 40px;
      }
    }

    .toast-body__title {
      font-size: 1.2rem;
    }

    .toast-body__text {
      font-size: 1rem;
    }

    .dismiss-toast {
      position: absolute;
      top: -11px;
      right: -11px;
      background-color: inherit;
      border: solid 2px white;
      border-radius: 50%;
      padding: 2px;

      .material-icons {
        font-size: 20px;
      }
    }
  }
</style>

{#each $toastStore as toast, index (toast.id)}
  <div
    class={`toast ${toast.type}`}
    transition:fly={{ x: 300, duration: 1000, easing: expoInOut }}
    style={"bottom:" + (index === 0 ? "50px" : 50 + 80 * index + "px")}
  >
    <div class="toast-icon">
      {#if toast.token}
        <img src={`images/${toast.token}.png`} alt="" />
      {:else if toast.icon}
        <span class="material-icons"> {toast.icon} </span>
      {:else if toast.type === "default"}
        <span class="material-icons"> visibility </span>
      {:else if toast.type === "success"}
        <span class="material-icons"> thumb_up </span>
      {:else if toast.type === "info"}
        <span class="material-icons"> info </span>
      {:else if toast.type === "error"}
        <span class="material-icons"> report </span>
      {/if}
    </div>
    <div class="toast-body">
      <div class="toast-body__title">
        {toast.title}
      </div>
      <div class="toast-body__text">
        {toast.text}
      </div>
    </div>
    {#if toast.dismissable}
      <span
        class="material-icons dismiss-toast"
        style="cursor:pointer;vertical-align:middle;float:right"
        on:click={() => toastStore.removeToast(toast.id)}
      >
        close
      </span>
    {/if}
  </div>
{/each}
