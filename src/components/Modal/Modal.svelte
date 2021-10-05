<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fly, fade } from "svelte/transition";

  export let type: "default" | "graph";

  const dispatch = createEventDispatcher();
</script>

<div class="modal-wrapper">
  <div
    class="modal-background"
    transition:fade={{ duration: 300 }}
    on:click={() => dispatch("close")}
  />
  <div
    class="modal"
    class:graph={type === "graph"}
    transition:fly={{ duration: 500, y: 400 }}
  >
    <slot name="modal-title" />
    <slot name="modal-body" />
    <slot name="modal-footer" />
  </div>
</div>
