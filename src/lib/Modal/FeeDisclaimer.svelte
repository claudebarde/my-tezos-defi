<script lang="ts">
  import store from "../../store";
</script>

<style lang="scss">
  .fee-disclaimer {
    font-size: 0.7rem;

    .material-icons {
      vertical-align: bottom;
      cursor: pointer;
      font-size: 0.7rem;
    }
  }
</style>

<div class="fee-disclaimer">
  You can help My Tezos Defi by adding <br /> a little contribution to the
  transaction: <br />
  3%
  <span class="material-icons" on:click={() => store.updateServiceFee(3)}>
    {$store.serviceFee === 3 ? "check_box" : "check_box_outline_blank"}
  </span>
  1%
  <span class="material-icons" on:click={() => store.updateServiceFee(1)}>
    {$store.serviceFee === 1 ? "check_box" : "check_box_outline_blank"}
  </span>
  No fee
  <span class="material-icons" on:click={() => store.updateServiceFee(null)}>
    {$store.serviceFee === null ? "check_box" : "check_box_outline_blank"}
  </span>
</div>
