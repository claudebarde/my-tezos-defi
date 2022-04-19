<script lang="ts">
  import type { AvailableVault, TezosContractAddress } from "../../types";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";
  import SafeImg from "../../assets/safe-48.png";

  export let vaults: Array<{
    platform: AvailableVault;
    address: TezosContractAddress;
    xtzLocked: number;
  }>;
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .vaults-header {
    padding: 30px 20px;
    margin: 0px;
    margin-bottom: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    text-align: center;

    & > div {
      padding: 0px 60px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    & > div:not(:last-child) {
      border-right: solid 2px $blizzard-blue;
    }
  }
</style>

{#if vaults}
  <div class="vaults-header">
    <div>
      <div>{vaults.length} vaults</div>
      <div>
        <img src={SafeImg} alt="barn" />
      </div>
    </div>
    <div>
      <div>Total value</div>
      <div>
        <b>
          {formatTokenAmount(
            [0, 0, ...vaults.map(vault => +vault.xtzLocked)].reduce(
              (a, b) => a + b
            )
          )} ꜩ
        </b>
      </div>
      <div>
        <span style="font-size:0.8rem">
          ({formatTokenAmount(
            [0, 0, ...vaults.map(vault => +vault.xtzLocked)].reduce(
              (a, b) => a + b
            ) * $store.xtzExchangeRate,
            2
          ).toLocaleString()} USD)
        </span>
      </div>
    </div>
  </div>
{/if}
