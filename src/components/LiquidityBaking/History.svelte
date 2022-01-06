<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import toastStore from "../Toast/toastStore";

  export let lbContractAddress: string;

  enum LbOpType {
    xtzToToken = "xtzToToken",
    tokenToXtz = "tokenToXtz",
    addLiquidity = "addLiquidity",
    removeLiquidity = "removeLiquidity"
  }
  type LbOp = {
    type: LbOpType;
    value: number;
    level: number;
    hash: string;
    timestamp: string;
  };

  let loading = false;
  let lbOps: LbOp[] = [];

  onMount(async () => {
    // fetches history of user transactions with the LB DEX
    loading = true;
    try {
      const url = `https://api.mainnet.tzkt.io/v1/accounts/${$store.userAddress}/operations?target=${lbContractAddress}&type=transaction&status=applied`;
      const lbOpsData = await fetch(url);
      if (lbOpsData) {
        const lbOperations = await lbOpsData.json();
        console.log(lbOperations);
        lbOperations.forEach(op => {
          const entrypoint = op.parameter.entrypoint as LbOpType;
          if (Object.keys(LbOpType).includes(entrypoint)) {
            let value;
            switch (entrypoint) {
              case LbOpType.xtzToToken:
                value = +op.parameter.value.minTokensBought;
                break;
              case LbOpType.tokenToXtz:
                value = +op.parameter.value.minXtzBought;
                break;
              case LbOpType.addLiquidity:
                value = +op.parameter.value.minLqtMinted;
                break;
              case LbOpType.removeLiquidity:
                value = +op.parameter.value.lqtBurned;
                break;
            }
            const lbOp: LbOp = {
              type: entrypoint,
              value,
              level: op.level,
              hash: op.hash,
              timestamp: op.timestamp
            };
            lbOps = [...lbOps, lbOp];
          }
        });
      }
    } catch (error) {
      console.error(error);
      toastStore.addToast({
        type: "error",
        title: "Loading error",
        text: "Unable to load transaction history",
        dismissable: true
      });
    } finally {
      loading = false;
    }
  });
</script>

<style lang="scss">
  .transaction-history {
    height: 100%;
    width: 100%;

    .lb-op-rows {
      height: 100%;
      overflow: auto;

      &::-webkit-scrollbar {
        display: none;
      }

      .lb-op-row {
        display: grid;
        grid-template-columns: 20% 30% 30% 30%;
        justify-items: center;
        align-items: center;
        text-align: left;
        padding: 10px 0px;

        & > div {
          width: 100%;
        }

        .lb-op-row__type {
          display: flex;
          justify-content: center;
          align-items: center;

          img {
            width: 24px;
            height: 24px;
          }
        }
      }
    }
  }
</style>

{#if lbOps.length > 0}
  <div class="transaction-history">
    <div class="lb-op-rows">
      {#each lbOps as lbOp}
        <div class="lb-op-row">
          <div class="lb-op-row__type">
            {#if lbOp.type === "xtzToToken"}
              <img src="images/XTZ.png" alt="XTZ" />
              <span class="material-icons"> keyboard_double_arrow_right </span>
              <img src="images/tzBTC.png" alt="tzBTC" />
            {:else if lbOp.type === "tokenToXtz"}
              <img src="images/tzBTC.png" alt="tzBTC" />
              <span class="material-icons"> keyboard_double_arrow_right </span>
              <img src="images/XTZ.png" alt="XTZ" />
            {:else if lbOp.type === "addLiquidity"}
              <span class="material-icons"> download </span>
              <img src="images/XTZ.png" alt="XTZ" />/<img
                src="images/tzBTC.png"
                alt="tzBTC"
              />
            {:else if lbOp.type === "removeLiquidity"}
              <span class="material-icons"> upload </span>
              <img src="images/XTZ.png" alt="XTZ" />/<img
                src="images/tzBTC.png"
                alt="tzBTC"
              />
            {/if}
          </div>
          <div>Value: {lbOp.value}</div>
          <div>Level: {lbOp.level}</div>
          <div>Timestamp: {lbOp.timestamp}</div>
        </div>
      {/each}
    </div>
  </div>
{/if}
