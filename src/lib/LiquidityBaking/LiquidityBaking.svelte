<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import store from "../../store";

  const lbContractAddress = "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5";
  let interval;
  let tokenPool = 0;
  let xtzPool = 0;
  let lqtTotal = 0;
  let tokenAddress = "";
  let lqtAddress = "";

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
  h3 {
    text-align: center;
  }

  .container-lb {
    padding: 10px;

    .container-lb__info {
      display: flex;
      justify-content: space-around;
      align-items: center;

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
    }
  }
</style>

<div class="container">
  <div class="title">Liquidity Baking DEX</div>
  <div class="container-lb">
    {#if tokenPool && xtzPool}
      <h3>TVL</h3>
      <div class="container-lb__info">
        <div>
          <img src="images/tzBTC.png" alt="tzbtc" />
          {(+(tokenPool / 10 ** 8).toFixed(5) / 1).toLocaleString("en-US")}
        </div>
        <div>
          <img src="images/XTZ.png" alt="xtz" />
          {(+(xtzPool / 10 ** 6).toFixed(5) / 1).toLocaleString("en-US")}
        </div>
        <div>
          <div class="lbt-symbol">LB</div>
          {(+(lqtTotal / 10 ** 1).toFixed(5) / 1).toLocaleString("en-US")}
        </div>
      </div>
    {:else}
      <h3>Loading...</h3>
    {/if}
  </div>
</div>
