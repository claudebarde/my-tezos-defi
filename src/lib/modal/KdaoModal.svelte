<script lang="ts">
  import type { modalAction } from "../../types";

  export let action: modalAction;

  let selectedAction = action;
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

<div>
  <ul class="vault-nav">
    <li
      class:selected={selectedAction === "borrow"}
      on:click={() => (selectedAction = "borrow")}
    >
      <button>Borrow</button>
    </li>
    <li
      class:selected={selectedAction === "payBack"}
      on:click={() => (selectedAction = "payBack")}
    >
      <button>Pay back</button>
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
  {#if selectedAction === "borrow"}
    <div>borrow</div>
  {:else if selectedAction === "payBack"}
    <div>pay back</div>
  {:else if selectedAction === "deposit"}
    <div>deposit</div>
  {:else if selectedAction === "withdraw"}
    <div>withdraw</div>
  {/if}
</div>
