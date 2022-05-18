<script lang="ts">
  import type { AvailableInvestment } from "../../types";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";
  import BarnImg from "../../assets/farm-48.png";

  export let farms:
    | Array<{
        id: AvailableInvestment;
        balance: number;
        value: number;
        rewards: number;
        roiPerWeek: number;
      }>
    | undefined;
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .farms-header {
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

  @media (max-width: $mobile-breakpoint) {
    .farms-header {
      flex-direction: column;
      padding: 10px;

      & > div {
        border: none;
      }
    }
  }
</style>

{#if farms}
  <div class="farms-header">
    <div>
      <div>{farms.length} farms</div>
      <div>
        <img src={BarnImg} alt="barn" />
      </div>
    </div>
    <div>
      <div>Total value</div>
      <div>
        <b>
          {formatTokenAmount(
            [0, 0, ...farms.map(farm => +farm.value)].reduce((a, b) => a + b)
          )} ꜩ
        </b>
      </div>
      <div>
        <span style="font-size:0.8rem">
          ({formatTokenAmount(
            [0, 0, ...farms.map(farm => +farm.value)].reduce((a, b) => a + b) *
              $store.xtzExchangeRate,
            2
          ).toLocaleString()} USD)
        </span>
      </div>
    </div>
    <div>
      <div>Total rewards</div>
      <div>
        <b>
          {formatTokenAmount(
            [0, 0, ...farms.map(farm => farm.rewards)].reduce((a, b) => a + b)
          )} ꜩ
        </b>
      </div>
      <div>
        <span style="font-size:0.8rem">
          ({formatTokenAmount(
            [0, 0, ...farms.map(farm => farm.rewards)].reduce((a, b) => a + b) *
              $store.xtzExchangeRate,
            2
          ).toLocaleString()} USD)
        </span>
      </div>
    </div>
    <div>
      <div>ROI per week</div>
      <div>
        <b>
          &thickapprox; {formatTokenAmount(
            [
              0,
              0,
              ...farms
                .filter(farm => !isNaN(farm.roiPerWeek))
                .map(farm => +farm.roiPerWeek)
            ].reduce((a, b) => a + b)
          )} ꜩ
        </b>
      </div>
      <div>
        <span style="font-size:0.8rem">
          ({formatTokenAmount(
            [
              0,
              0,
              ...farms
                .filter(farm => !isNaN(farm.roiPerWeek))
                .map(farm => +farm.roiPerWeek)
            ].reduce((a, b) => a + b) * $store.xtzExchangeRate,
            2
          ).toLocaleString()} USD)
        </span>
      </div>
    </div>
  </div>
{/if}
