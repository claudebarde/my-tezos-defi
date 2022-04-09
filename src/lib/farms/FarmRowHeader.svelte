<script lang="ts">
  import { formatTokenAmount } from "../../utils";

  export let totalRewards: Array<number>, name: string;
</script>

<div class="farm-header">
  <h3>{name} farms</h3>
  <div class="farm-header__right">
    <div style="margin-right: 20px">
      Total rewards: {formatTokenAmount(
        [0, 0, ...totalRewards].reduce((a, b) => a + b)
      )} ꜩ
    </div>
    <button class="primary mini">
      <span class="material-icons-outlined"> agriculture </span>
      Harvest all
    </button>
  </div>
</div>
