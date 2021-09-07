<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { ComplexBatchedOp } from "../../../types";
  import Harvest from "./Harvest.svelte";
  import Transfer from "./Transfer.svelte";
  import Exchange from "./Exchange.svelte";
  import Stake from "./Stake.svelte";

  export let op: ComplexBatchedOp;

  const dispatch = createEventDispatcher();
</script>

<style lang="scss">
  @import "../../../styles/settings.scss";

  .action-box {
    position: relative;
    padding: 10px;
    border-radius: 10px;
    width: 90%;

    &.harvest {
      background-color: #10b981;
    }
    &.transfer {
      background-color: #f59e0b;
    }
    &.exchange {
      background-color: #3b82f6;
    }
    &.stake {
      background-color: #8b5cf6;
    }

    .action-box__close {
      opacity: 0;
      width: 30px;
      height: 30px;
      position: absolute;
      top: -14px;
      right: -17px;
      cursor: pointer;
      border-radius: 50%;
      background-color: $container-bg-color;
      transition: opacity 0.3s;

      .material-icons {
        font-size: 30px;
      }
    }

    &:hover .action-box__close {
      opacity: 1;
    }
  }
</style>

<div class={`action-box ${op.type}`}>
  <div class="action-box__close" on:click={() => dispatch("remove", op.id)}>
    <span class="material-icons"> highlight_off </span>
  </div>
  {#if op.type === "harvest"}
    <Harvest {op} />
  {:else if op.type === "transfer"}
    <Transfer {op} />
  {:else if op.type === "exchange"}
    <Exchange {op} />
  {:else if op.type === "stake"}
    <Stake {op} />
  {/if}
</div>
