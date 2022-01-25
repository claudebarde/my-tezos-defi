<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import Trade from "./Trade.svelte";
  import AddLiquidity from "./AddLiquidity.svelte";
  import RemoveLiquidity from "./RemoveLiquidity.svelte";
  import History from "./History.svelte";
  import { formatTokenAmount, lqtOutput } from "../../utils";

  const lbContractAddress = "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5";
  const lqtContractAddress = "KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo";
  let interval;
  let tokenPool = 0;
  let xtzPool = 0;
  let lqtTotal = 0;
  let tokenAddress = "";
  let lqtAddress = "";
  let userLqtBalance = 0;
  let lqtBalanceValue: {
    xtz: null | number;
    tzBTC: null | number;
    fiat: null | number;
  } = { xtz: null, tzBTC: null, fiat: null };
  let selectedTab: "trade" | "add-liquidity" | "remove-liquidity" | "history" =
    "trade";

  const fetchUserLqtBalance = async (userAddress): Promise<number> => {
    const contract = await $store.Tezos.wallet.at(lqtContractAddress);
    const storage: any = await contract.storage();
    const balance = await storage.tokens.get(userAddress);
    if (balance) {
      return balance.toNumber();
    } else {
      return 0;
    }
  };

  const fetchData = async () => {
    try {
      const contract = await $store.Tezos.wallet.at(lbContractAddress);
      const storage: any = await contract.storage();
      tokenPool = storage.tokenPool;
      xtzPool = storage.xtzPool;
      lqtTotal = storage.lqtTotal;
      tokenAddress = storage.tokenAddress;
      lqtAddress = storage.lqtAddress;
      userLqtBalance = await fetchUserLqtBalance($store.userAddress);

      store.updateLiquitidyBaking({
        tokenPool,
        xtzPool,
        lqtTotal,
        balance: userLqtBalance
      });

      const xtzVal = lqtOutput({
        lqTokens: userLqtBalance,
        pool: xtzPool,
        lqtTotal,
        decimals: 6
      });
      const tzbtcVal = lqtOutput({
        lqTokens: userLqtBalance,
        pool: tokenPool,
        lqtTotal,
        decimals: 8
      });
      const fiatVal =
        xtzVal * $store.xtzData.exchangeRate +
        tzbtcVal *
          $store.tokens.tzBTC.exchangeRate *
          $store.xtzData.exchangeRate;
      lqtBalanceValue = {
        xtz: xtzVal ? xtzVal : null,
        tzBTC: tzbtcVal ? tzbtcVal : null,
        fiat: fiatVal ? fiatVal : null
      };
    } catch (error) {
      console.error(error);
    }
  };

  onMount(async () => {
    if ($store.Tezos && $store.userAddress) {
      await fetchData();
      interval = setInterval(fetchData, 600000);
    } else {
      console.error(`Tezos toolkit or user address unavailable`);
    }
  });

  onDestroy(() => clearInterval(interval));
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .title {
    text-align: center;
    padding: 20px;
    font-size: 1.4rem;
  }

  .subtitle {
    text-align: center;
    padding: 10px 0px 20px 0px;
    font-size: 0.9rem;
  }

  .lb-info {
    display: flex;
    justify-content: space-around;
    align-items: center;
  }

  .container-lb {
    height: 90%;

    .row {
      justify-content: space-around;
      align-items: center;

      &.tvl {
        display: flex;
        border-bottom: solid 4px $border-color;
      }

      .tvl-details {
        display: flex;
        flex-direction: column;
        text-align: center;
        background-color: lighten($container-bg-color, 65);
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
        height: 100%;
        padding: 10px 20px;

        span {
          font-size: 0.8rem;
          padding-top: 10px;
        }

        .tvl-details-info {
          display: flex;
          justify-content: center;
          align-items: center;
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
        border: solid 2px $container-bg-color;
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
          padding: 15px;
          cursor: pointer;
          border-bottom: solid 3px transparent;
          transition: 0.3s;

          &.selected {
            border-bottom: solid 3px $container-bg-color;
          }
        }
      }
    }

    .interact {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      background-color: lighten($container-bg-color, 65);
      border-radius: 10px;
      padding: 20px 10px;
    }
  }
</style>

<div class="container">
  <div class="title">Liquidity Baking DEX</div>
  <div class="lb-info">
    <div class="subtitle">
      {#if tokenPool && xtzPool}
        <div>Exchange rate</div>
        <div>
          1 XTZ = {formatTokenAmount(tokenPool / xtzPool / 100, 9)}
          tzBtc
        </div>
      {/if}
    </div>
    {#if xtzPool && tokenPool && userLqtBalance}
      <div class="subtitle" style="font-size:0.9rem">
        <div>Your LQT balance: {userLqtBalance} LQT</div>
        <div>
          &thickapprox; {formatTokenAmount(lqtBalanceValue.xtz)} XTZ + {formatTokenAmount(
            lqtBalanceValue.tzBTC
          )} tzBTC
        </div>
        <div>
          &thickapprox; {formatTokenAmount(lqtBalanceValue.fiat, 2)}
          {$localStorageStore.preferredFiat}
        </div>
      </div>
    {/if}
  </div>
  <div class="container-lb">
    {#if tokenPool && xtzPool}
      <div class="row tvl">
        <div class="tvl-details">
          <span>Locked tzBTC</span>
          <div class="tvl-details-info">
            <img src="images/tzBTC.png" alt="tzbtc" />
            &nbsp;
            {(+(tokenPool / 10 ** 8).toFixed(5) / 1).toLocaleString("en-US")}
          </div>
        </div>
        <div class="tvl-details">
          <span>Locked XTZ</span>
          <div class="tvl-details-info">
            <img src="images/XTZ.png" alt="xtz" />
            &nbsp;
            {(+(xtzPool / 10 ** 6).toFixed(5) / 1).toLocaleString("en-US")}
          </div>
        </div>
        <div class="tvl-details">
          <span>LQT total supply</span>
          <div class="tvl-details-info">
            <div class="lbt-symbol">LB</div>
            &nbsp;
            {(+lqtTotal).toLocaleString("en-US")}
          </div>
        </div>
        {#if userLqtBalance}
          <div class="tvl-details">
            <span>Your LQT balance</span>
            <div class="tvl-details-info">
              <div class="lbt-symbol">LB</div>
              &nbsp;
              {userLqtBalance.toLocaleString("en-US")}
            </div>
          </div>
        {/if}
      </div>
      {#if $store.userAddress}
        <div class="row" style="overflow:hidden">
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
            <label
              for="lb-interact-history"
              class:selected={selectedTab === "history"}
            >
              <input
                type="radio"
                name="lb-interact"
                id="lb-interact-history"
                bind:group={selectedTab}
                value="history"
              />
              History
            </label>
          </div>
          <div
            class="interact"
            style={selectedTab === "history" ? "height:90%" : ""}
          >
            {#if selectedTab === "trade"}
              <Trade {lbContractAddress} {tokenPool} {xtzPool} />
            {:else if selectedTab === "add-liquidity"}
              <AddLiquidity
                {lbContractAddress}
                {tokenPool}
                {xtzPool}
                {lqtTotal}
                refreshData={fetchData}
              />
            {:else if selectedTab === "remove-liquidity"}
              <RemoveLiquidity
                {lbContractAddress}
                {tokenPool}
                {xtzPool}
                {lqtTotal}
                {userLqtBalance}
                refreshData={fetchData}
              />
            {:else if selectedTab === "history"}
              <History {lbContractAddress} />
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <h3>Loading...</h3>
    {/if}
  </div>
</div>
