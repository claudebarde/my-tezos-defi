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
      background-color: lighten(#f59e0b, 30);
    }
  }
</style>

<div class="action-box__transfer">
  <div>
    <span class="material-icons"> send </span>
  </div>
  <div>
    Send
    <input type="text" style="width:100px" />
    {op.origin}
    to
    <input type="text" style="width:200px" />
  </div>
  <div />
</div>
