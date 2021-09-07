<script lang="ts">
  import type { ComplexBatchedOp, InvestmentPlatform } from "../../types";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import ActionBox from "./ActionBoxes/ActionBox.svelte";
  import Confirm from "./ActionBoxes/Confirm.svelte";
  import SelectBox from "../Tools/SelectBox.svelte";

  let batchedOps: ComplexBatchedOp[] = [];

  const createNewOp = (id: string, type: ComplexBatchedOp["type"]) => {
    let platform: InvestmentPlatform | undefined = undefined;
    if (type === "harvest") {
      platform = $store.investments[id].platform;
    } else if (type === "exchange") {
      if (id === "quipuswap") {
        platform = "quipuswap";
      } else {
        platform = "plenty";
      }
    }

    batchedOps = [
      ...batchedOps,
      {
        id: `${id}-${Math.round(Math.random() * 10000)}`,
        platform,
        origin: id,
        type,
        op: null
      }
    ];
  };

  const removeOp = (id: string) => {
    batchedOps = [...batchedOps.filter(op => op.id !== id)];
  };
</script>

<style lang="scss">
  .container-complex-swaps {
    padding: 20px;

    .container-complex-swaps__actions {
      display: grid;
      margin: 0 auto;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 20px;
      text-align: center;

      & > div {
        border: solid 2px white;
        border-radius: 10px;
        padding: 10px;

        .action__title {
          padding: 10px;
          border-bottom: solid 1px white;
        }

        .action__buttons {
          padding: 10px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;

          & > button {
            margin: 5px;
          }
        }
      }
    }

    .container-complex-swaps__batch {
      border: solid 2px white;
      border-radius: 10px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
  }
</style>

<div class="container">
  <div class="title">Batched operations</div>
  <div class="container-complex-swaps">
    <div class="container-complex-swaps__actions">
      <div>
        <div class="action__title">Stake</div>
        <div class="action__buttons">
          <SelectBox
            options={$localStorageStore.favoriteInvestments
              .map(key => $store.investments[key])
              .map(inv => ({ icons: inv.icons, name: inv.id }))}
            selected={undefined}
            displaySelection={false}
            on:new-selection={e => createNewOp(e.detail, "stake")}
          />
        </div>
      </div>
      <div>
        <div class="action__title">Harvest</div>
        <div class="action__buttons">
          <SelectBox
            options={$localStorageStore.favoriteInvestments
              .map(key => $store.investments[key])
              .map(inv => ({ icons: inv.icons, name: inv.id }))}
            selected={undefined}
            displaySelection={false}
            on:new-selection={e => createNewOp(e.detail, "harvest")}
          />
        </div>
      </div>
      <div>
        <div class="action__title">Transfer</div>
        <div class="action__buttons">
          <SelectBox
            options={Object.keys($store.tokens).map(tk => ({
              icons: [tk],
              name: tk
            }))}
            selected={undefined}
            displaySelection={false}
            on:new-selection={e => createNewOp(e.detail, "transfer")}
          />
        </div>
      </div>
      <div>
        <div class="action__title">Exchange</div>
        <div class="action__buttons">
          <button
            class="button mini"
            on:click={() => createNewOp("quipuswap", "exchange")}
          >
            QuipuSwap
          </button>
          <button
            class="button mini"
            on:click={() => createNewOp("plentyswap", "exchange")}
          >
            PlentySwap
          </button>
        </div>
      </div>
    </div>
    <br />
    <div class="container-complex-swaps__batch">
      {#each batchedOps as op, index (op.id)}
        <ActionBox {op} on:remove={e => removeOp(e.detail)} />
        <span class="material-icons"> keyboard_double_arrow_down </span>
      {:else}
        No operation
      {/each}
      {#if batchedOps.length > 0}
        <Confirm ops={batchedOps} />
      {/if}
    </div>
  </div>
</div>
