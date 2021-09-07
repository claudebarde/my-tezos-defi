<script lang="ts">
  import { findDex, estimateSwap } from "@quipuswap/sdk";
  import type { ComplexBatchedOp } from "../../../types";
  import store from "../../../store";
  import type { AvailableToken } from "../../../types";
  import config from "../../../config";

  export let op: ComplexBatchedOp;

  let val = "";
  let fromToken: AvailableToken;
  let toToken: AvailableToken;
  let quipuswapSwapResult: null | number = null;

  const fetchQuipuswapRate = async () => {
    if (
      op.platform === "quipuswap" &&
      val &&
      !isNaN(+val) &&
      fromToken &&
      toToken
    ) {
      const fromTk = {
        contract: $store.tokens[fromToken].address,
        id: $store.tokens[fromToken].tokenId
      };
      const toTk = {
        contract: $store.tokens[toToken].address,
        id: $store.tokens[toToken].tokenId
      };
      const dex = await findDex(
        $store.Tezos,
        config.quipuswapFactories,
        fromTk
      );
      if (dex) {
        const estimatedSwap = await estimateSwap(
          $store.Tezos,
          config.quipuswapFactories,
          fromTk,
          toTk,
          {
            inputValue: +val * 10 ** $store.tokens[fromToken].decimals
          }
        );
        if (estimatedSwap) {
          quipuswapSwapResult =
            estimatedSwap.toNumber() / 10 ** $store.tokens[toToken].decimals;
        } else {
          quipuswapSwapResult = null;
        }
      } else {
        quipuswapSwapResult = null;
      }
      console.log(quipuswapSwapResult);
    }
  };

  const updateToken = async (token: AvailableToken, dir: "from" | "to") => {
    if (dir === "from") {
      fromToken = token;
    } else {
      toToken = token;
    }
  };
</script>

<style lang="scss">
  .action-box__transfer {
    display: flex;
    justify-content: space-between;
    align-items: center;

    input[type="text"] {
      width: 150px;
      background-color: lighten(#3b82f6, 30);
    }

    select {
      background-color: lighten(#3b82f6, 30);
      padding: 5px 8px;
      border-radius: 10px;
      border: none;
      font-size: 0.8rem;
      outline: none;
    }
  }
</style>

<div class="action-box__transfer">
  <div>
    <span class="material-icons"> sync_alt </span>
  </div>
  <div style="display:flex">
    <div>
      <input type="text" bind:value={val} on:input={fetchQuipuswapRate} />
      <select on:change={e => updateToken(e.target.value, "from")}>
        {#each Object.keys($store.tokens)
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          .filter(tk => tk.toLowerCase() !== op.origin.toLowerCase()) as token}
          <option value={token}>{token}</option>
        {/each}
      </select>
    </div>
    &nbsp;&nbsp;
    <div>
      <span class="material-icons"> arrow_forward </span>
    </div>
    &nbsp;&nbsp;
    <div>
      <input
        type="text"
        disabled
        value={quipuswapSwapResult ? quipuswapSwapResult.toFixed(6) : ""}
      />
      <select on:change={e => updateToken(e.target.value, "to")}>
        {#each Object.keys($store.tokens)
          .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          .filter(tk => tk.toLowerCase() !== op.origin.toLowerCase()) as token}
          <option value={token}>{token}</option>
        {/each}
      </select>
    </div>
  </div>
  <div />
</div>
