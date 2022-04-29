<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, fly } from "svelte/transition";
  import type { InvestmentPlatform, modalAction } from "../../types";
  import KdaoModal from "./KdaoModal.svelte";

  export let type: "vault" | "farm",
    platform: InvestmentPlatform,
    action: modalAction;

  const dispatch = createEventDispatcher();
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .modal-wrapper {
    position: absolute;
    top: 0px;
    left: 0px;
    padding: 0px;
    margin: 0px;
    width: 100vw;
    height: 100vh;
    z-index: 990;

    .modal-background {
      position: absolute;
      top: 0px;
      left: 0px;
      padding: 0px;
      margin: 0px;
      width: 100%;
      height: 100%;
      background-color: rgba($dark-cornflower-blue, 0.6);
      z-index: 995;
    }

    .modal {
      background-color: white;
      padding: 20px;
      z-index: 999;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: $std-border-radius;
    }
  }
</style>

<div class="modal-wrapper">
  <div
    class="modal-background"
    transition:fade={{ duration: 300 }}
    on:click={() => dispatch("close")}
  />
  <div class="modal" transition:fly={{ y: -200, duration: 300 }}>
    {#if type === "vault" && platform === "kdao"}
      <KdaoModal {action} />
    {:else}
      This is a modal
    {/if}
  </div>
</div>
