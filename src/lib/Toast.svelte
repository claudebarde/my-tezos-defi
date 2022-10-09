<script lang="ts">
  import { fly } from "svelte/transition";
  import toastStore from "../toastStore";
  import { ToastType } from "../types";

  const calcToastPos = (index: number): number => {
    const bottomGap = 30;

    if (index === 0) {
      return bottomGap;
    } else {
      return bottomGap + 100 * index;
    }
  };
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .toast {
    position: absolute;
    right: 30px;
    border-radius: $std-border-radius;
    padding: 20px;
    display: grid;
    grid-template-columns: 20% 80%;
    align-items: center;
    gap: 10px;
    width: 35%;
    max-height: 90px;
    z-index: 999;
    box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px,
      rgba(0, 0, 0, 0.23) 0px 6px 6px;

    span.material-icons-outlined {
      font-size: 1.8rem;
    }

    &.info {
      border: solid 1px $blue-green;
      background-color: $blue-green;
      color: white;

      #close-toast {
        background-color: $blue-green;
      }
    }

    &.error {
      border: solid 1px $red;
      background-color: $red;
      color: white;

      #close-toast {
        background-color: $red;
      }
    }

    &.success {
      border: solid 1px $emerald-green;
      background-color: $emerald-green;
      color: white;

      #close-toast {
        background-color: $emerald-green;
      }
    }

    &.warning {
      border: solid 1px $cyber-yellow;
      background-color: $cyber-yellow;
      color: white;

      #close-toast {
        background-color: $cyber-yellow;
      }
    }

    #close-toast {
      $size: 35px;
      position: absolute;
      top: -15px;
      right: -15px;
      border-radius: 50%;
      cursor: pointer;
      border: none;
      padding: 0px;
      width: $size;
      display: flex;
      justify-content: center;
      align-items: center;

      span.material-icons-outlined {
        font-size: $size;
        padding: 0px;
        margin: 0px;
      }
    }
  }
</style>

{#each $toastStore as toast, index (toast.id)}
  <div
    class="toast"
    class:info={toast.type === ToastType.INFO ||
      toast.type === ToastType.TRANSFER}
    class:error={toast.type === ToastType.ERROR}
    class:success={toast.type === ToastType.SUCCESS}
    class:warning={toast.type === ToastType.WARNING}
    transition:fly={{ duration: 600, x: 400 }}
    style={`bottom:${calcToastPos(index)}px`}
  >
    <button id="close-toast" on:click={() => toastStore.removeToast(toast.id)}>
      <span class="material-icons-outlined"> highlight_off </span>
    </button>
    <div>
      {#if toast.type === ToastType.INFO}
        <span class="material-icons-outlined"> info </span>
      {:else if toast.type === ToastType.ERROR}
        <span class="material-icons-outlined"> sentiment_dissatisfied </span>
      {:else if toast.type === ToastType.SUCCESS}
        <span class="material-icons-outlined"> celebration </span>
      {:else if toast.type === ToastType.WARNING}
        <span class="material-icons-outlined"> report_problem </span>
      {:else if toast.type === ToastType.TRANSFER}
        <span class="material-icons-outlined"> file_download </span>
      {/if}
    </div>
    <div>{toast.message}</div>
  </div>
{/each}
