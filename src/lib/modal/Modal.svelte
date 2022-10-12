<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, fly } from "svelte/transition";
  import type { InvestmentPlatform, modalAction } from "../../types";
  import KdaoModal from "./KdaoModal.svelte";
  import CtezModal from "./CtezModal.svelte";
  import TxQueueModal from "./TxQueueModal.svelte";
  import FarmModal from "./FarmModal.svelte";
  import SendTokenModal from "./SendTokenModal.svelte";

  export let type: "vault" | "farm" | "tx-queue" | "send-token",
    platform: InvestmentPlatform | undefined,
    action: modalAction | undefined,
    payload: any;

  const dispatch = createEventDispatcher();
</script>

<div class="modal-wrapper">
  <div
    class="modal-background"
    transition:fade={{ duration: 300 }}
    on:click={() => dispatch("close")}
  />
  <div class="modal" transition:fly={{ y: -200, duration: 300 }}>
    {#if type === "vault" && platform === "kdao"}
      <KdaoModal {action} {payload} on:close={() => dispatch("close")} />
    {:else if type === "vault" && platform === "ctez"}
      <CtezModal {action} {payload} on:close={() => dispatch("close")} />
    {:else if type === "tx-queue"}
      <TxQueueModal on:close={() => dispatch("close")} />
    {:else if type === "farm"}
      <FarmModal {platform} {payload} on:close={() => dispatch("close")} />
    {:else if type === "send-token"}
      <SendTokenModal {payload} on:close={() => dispatch("close")} />
    {:else}
      This is a modal
    {/if}
  </div>
</div>
