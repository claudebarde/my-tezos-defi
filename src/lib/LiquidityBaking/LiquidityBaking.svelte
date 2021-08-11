<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import store from "../../store";
  import Trade from "./Trade.svelte";
  import AddLiquidity from "./AddLiquidity.svelte";
  import RemoveLiquidity from "./RemoveLiquidity.svelte";

  const lbContractAddress = "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5";
  let interval;
  let tokenPool = 0;
  let xtzPool = 0;
  let lqtTotal = 0;
  let tokenAddress = "";
  let lqtAddress = "";
  let selectedTab: "trade" | "add-liquidity" | "remove-liquidity" = "trade";

  const fetchData = async () => {
    const contract = await $store.Tezos.wallet.at(lbContractAddress);
    const storage: any = await contract.storage();
    tokenPool = storage.tokenPool;
    xtzPool = storage.xtzPool;
    lqtTotal = storage.lqtTotal;
    tokenAddress = storage.tokenAddress;
    lqtAddress = storage.lqtAddress;
  };

  onMount(async () => {
    if ($store.Tezos) {
      await fetchData();
      interval = setInterval(fetchData, 600000);
    }
  });

  onDestroy(() => clearInterval(interval));
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  h3 {
    text-align: center;
  }

  .container-lb {
    .row {
      padding: 15px 10px;
      justify-content: space-around;
      align-items: center;

      &.tvl {
        display: flex;
      }

      &:not(:first-child) {
        border-top: solid 4px $border-color;
      }

      .tvl-details {
        display: flex;
        flex-direction: column;
        text-align: center;

        span {
          font-size: 0.8rem;
        }
      }

      img {
        width: 30px;
        height: 30px;
        vertical-align: bottom;
      }

      .lbt-symbol {
        display: inline-block;
        width: 28px;
        height: 28px;
        vertical-align: bottom;
        border: solid 2px white;
        border-radius: 50%;
        line-height: 28px;
        text-align: center;
      }

      .tabs {
        display: flex;
        justify-content: center;
        align-items: center;

        input[type="radio"] {
          position: fixed;
          opacity: 0;
          pointer-events: none;
        }

        label {
          padding: 5px 15px;
          cursor: pointer;
          border-bottom: solid 3px transparent;
          transition: 0.3s;

          &.selected {
            border-bottom: solid 3px white;
          }
        }
      }
    }

    .interact {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
</style>

<div class="container">
  <div class="title">Liquidity Baking DEX</div>
  <div class="container-lb">
    {#if tokenPool && xtzPool}
      <div class="row tvl">
        <div class="tvl-details">
          <span>Locked tzBTC</span>
          <div>
            <img src="images/tzBTC.png" alt="tzbtc" />
            {(+(tokenPool / 10 ** 8).toFixed(5) / 1).toLocaleString("en-US")}
          </div>
        </div>
        <div class="tvl-details">
          <span>Locked XTZ</span>
          <div>
            <img src="images/XTZ.png" alt="xtz" />
            {(+(xtzPool / 10 ** 6).toFixed(5) / 1).toLocaleString("en-US")}
          </div>
        </div>
        <div class="tvl-details">
          <span>LQT total supply</span>
          <div>
            <div class="lbt-symbol">LB</div>
            {(+(lqtTotal / 10 ** 1).toFixed(5) / 1).toLocaleString("en-US")}
          </div>
        </div>
      </div>
      <div class="row">
        <div class="tabs">
          <label
            for="lb-interact-trade"
            class:selected={selectedTab === "trade"}
          >
            <input
              type="radio"
              name="lb-interact"
              id="lb-interact-trade"
              bind:group={selectedTab}
              value="trade"
            />
            Trade
          </label>
          <label
            for="lb-interact-add-liquidity"
            class:selected={selectedTab === "add-liquidity"}
          >
            <input
              type="radio"
              name="lb-interact"
              id="lb-interact-add-liquidity"
              bind:group={selectedTab}
              value="add-liquidity"
            />
            Add liquidity
          </label>
          <label
            for="lb-interact-remove-liquidity"
            class:selected={selectedTab === "remove-liquidity"}
          >
            <input
              type="radio"
              name="lb-interact"
              id="lb-interact-remove-liquidity"
              bind:group={selectedTab}
              value="remove-liquidity"
            />
            Remove liquidity
          </label>
        </div>
        <br />
        <br />
        <div class="interact">
          {#if selectedTab === "trade"}
            <Trade {lbContractAddress} {tokenPool} {xtzPool} />
          {:else if selectedTab === "add-liquidity"}
            <AddLiquidity
              {lbContractAddress}
              {tokenPool}
              {xtzPool}
              {lqtTotal}
            />
          {:else if selectedTab === "remove-liquidity"}
            <RemoveLiquidity />
          {/if}
        </div>
      </div>
    {:else}
      <h3>Loading...</h3>
    {/if}
  </div>
</div>
