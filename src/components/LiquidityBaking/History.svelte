<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import toastStore from "../Toast/toastStore";
  import { formatTokenAmount } from "../../utils";

  export let lbContractAddress: string;

  enum LbOpType {
    xtzToToken = "xtzToToken",
    tokenToXtz = "tokenToXtz",
    addLiquidity = "addLiquidity",
    removeLiquidity = "removeLiquidity"
  }
  type LbOp = {
    type: LbOpType;
    value: { xtz: number; tzBtc: number; lqt?: number };
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
        lbOperations.forEach(op => {
          const entrypoint = op.parameter.entrypoint as LbOpType;
          if (Object.keys(LbOpType).includes(entrypoint)) {
            let value;
            switch (entrypoint) {
              case LbOpType.xtzToToken:
                value = {
                  xtz: +op.amount,
                  tzBtc: +op.parameter.value.minTokensBought
                };
                break;
              case LbOpType.tokenToXtz:
                value = {
                  xtz: +op.parameter.value.minXtzBought,
                  tzBtc: +op.parameter.value.tokensSold
                };
                break;
              case LbOpType.addLiquidity:
                value = {
                  xtz: +op.amount,
                  tzBtc: +op.parameter.value.maxTokensDeposited,
                  lqt: +op.parameter.value.minLqtMinted
                };
                break;
              case LbOpType.removeLiquidity:
                value = {
                  xtz: +op.parameter.value.minXtzWithdrawn,
                  tzBtc: +op.parameter.value.minTokensWithdrawn,
                  lqt: +op.parameter.value.lqtBurned
                };
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
        grid-template-columns: 15% 35% 20% 30%;
        align-items: center;
        padding: 10px 0px;

        .lb-op-row__type {
          display: flex;
          justify-content: center;
          align-items: center;

          img {
            width: 24px;
            height: 24px;
          }
        }

        .lb-op-row__value {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
        }

        .lb-op-row__level {
          text-align: center;
        }

        .lb-op-row__timestamp {
          text-align: center;
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
          <div class="lb-op-row__value">
            {#if lbOp.type === "xtzToToken"}
              <div>{formatTokenAmount(lbOp.value.xtz / 10 ** 6)} XTZ out</div>
              <div>
                {formatTokenAmount(
                  lbOp.value.tzBtc / 10 ** $store.tokens.tzBTC.decimals,
                  9
                )} tzBTC in
              </div>
              <div>
                1 XTZ = {formatTokenAmount(
                  lbOp.value.tzBtc /
                    10 ** $store.tokens.tzBTC.decimals /
                    (lbOp.value.xtz / 10 ** 6),
                  9
                )} tzBtc
              </div>
            {:else if lbOp.type === "tokenToXtz"}
              <div>{formatTokenAmount(lbOp.value.xtz / 10 ** 6)} XTZ in</div>
              <div>
                {formatTokenAmount(
                  lbOp.value.tzBtc / 10 ** $store.tokens.tzBTC.decimals,
                  9
                )} tzBTC out
              </div>
              <div>
                1 XTZ = {formatTokenAmount(
                  lbOp.value.tzBtc /
                    10 ** $store.tokens.tzBTC.decimals /
                    (lbOp.value.xtz / 10 ** 6),
                  9
                )} tzBtc
              </div>
            {:else if lbOp.type === "addLiquidity"}
              <div>
                {formatTokenAmount(lbOp.value.xtz / 10 ** 6)} XTZ / {formatTokenAmount(
                  lbOp.value.tzBtc / 10 ** $store.tokens.tzBTC.decimals,
                  9
                )} tzBtc
              </div>
              <div>{lbOp.value.lqt} LQT</div>
            {:else if lbOp.type === "removeLiquidity"}
              <div>{lbOp.value.lqt} LQT</div>
              <div>
                {formatTokenAmount(lbOp.value.xtz / 10 ** 6)} XTZ / {formatTokenAmount(
                  lbOp.value.tzBtc / 10 ** $store.tokens.tzBTC.decimals,
                  9
                )} tzBtc
              </div>
            {/if}
          </div>
          <div class="lb-op-row__level">Level <br /> {lbOp.level}</div>
          <div class="lb-op-row__timestamp">{lbOp.timestamp}</div>
        </div>
      {/each}
      <br />
      <br />
      <br />
      <br />
    </div>
  </div>
{/if}
