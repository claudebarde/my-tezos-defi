<script lang="ts">
  import type { ComplexBatchedOp } from "../../../types";
  import store from "../../../store";

  export let op: ComplexBatchedOp;
</script>

<style lang="scss">
  .action-box__transfer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    input[type="text"] {
      background-color: lighten(#8b5cf6, 30);
      width: 150px;
    }
  }
</style>

<div class="action-box__transfer">
  <div>
    <span class="material-icons"> reorder </span>
  </div>
  <div>
    Stake
    <input type="text" />
  </div>
  <div>
    {op.origin}
  </div>
</div>
