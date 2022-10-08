<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { slide } from "svelte/transition";
  import Chart from "chart.js/auto/auto.js";
  import { AvailableToken, AvailableFiat } from "../types";
  import store from "../store";
  import { formatTokenAmount } from "../utils";
  import type { FiatData } from "../localStorage";
  import config from "../config";

  export let token: AvailableToken;

  let userBalance;
  let tokenAggregateDaily: { increase: boolean; difference: number };
  let tokenStatsChartData: { timestamp: string; price: number }[] = [];
  let chart;
  let expand = false;
  let currentFiat: FiatData;

  const generateChart = (chartData: { timestamp: string; price: number }[]) => {
    const data = {
      labels: [],
      datasets: [
        {
          label: "Price",
          data: [],
          fill: false,
          borderColor:
            chartData[0].price > chartData[chartData.length - 1].price
              ? "red"
              : "green",
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0
        }
      ]
    };

    chartData.forEach(d => {
      data.datasets[0].data.push(d.price);
      data.labels.push(d.timestamp.replace(/T.*Z/, ""));
    });
    const canvas = document.getElementById(
      `token-price-change-chart-${token}`
    ) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (chart) chart.destroy();

      chart = new Chart(ctx, {
        type: "line",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              ticks: { display: false },
              grid: { display: false, drawBorder: false }
            },
            y: {
              ticks: { display: false },
              grid: { display: false, drawBorder: false }
            }
          }
        }
      });
    }
  };

  const fetchTokensStats = async (token: AvailableToken) => {
    const tokenInfo = $store.tokens[token];
    if (tokenInfo) {
      let url;
      if (tokenInfo.type === "fa1.2" && tokenInfo.dexContractAddress) {
        url = `https://api.teztools.io/v1/${tokenInfo.address}/pools/${tokenInfo.dexContractAddress}/aggregate_daily`;
      } else if (tokenInfo.type === "fa2" && tokenInfo.dexContractAddress) {
        url = `https://api.teztools.io/v1/${tokenInfo.address}_${tokenInfo.tokenId}/pools/${tokenInfo.dexContractAddress}/aggregate_daily`;
      }
      if (url) {
        const tokenAggregateDailyRes = await fetch(url);
        if (tokenAggregateDailyRes) {
          const tokenAggregateDailyRaw = await tokenAggregateDailyRes.json();
          // calculates increase or decrease percentage
          const lastPrice =
            tokenAggregateDailyRaw[tokenAggregateDailyRaw.length - 1].t1priceMa;
          tokenAggregateDaily = {
            increase:
              tokenAggregateDailyRaw[tokenAggregateDailyRaw.length - 8]
                .t1priceMa < lastPrice,
            difference: (() => {
              const priceBefore =
                tokenAggregateDailyRaw[tokenAggregateDailyRaw.length - 8]
                  .t1priceMa;
              const difference =
                (priceBefore - lastPrice) / ((priceBefore + lastPrice) / 2);
              return Math.abs(difference * 100);
            })()
          };
          // prepares data for chart
          if (tokenAggregateDailyRaw.length > 30) {
            tokenStatsChartData = tokenAggregateDailyRaw
              .slice(-30)
              .map(data => ({
                timestamp: data.periodOpen,
                price: data.t1priceMa
              }));
            generateChart(tokenStatsChartData);
          }
        }
      }
    }
  };

  onMount(async () => {
    await fetchTokensStats(token);
  });

  afterUpdate(async () => {
    const userToken = $store.userTokens.find(tk => tk.name === token);
    if (userToken) {
      userBalance = userToken.balance / 10 ** $store.tokens[token].decimals;
    } else {
      console.error("Token for TokenBox not found");
    }

    if (expand) {
      generateChart(tokenStatsChartData);
    }

    if ($store.localStorage) {
      currentFiat = $store.localStorage.getFavoriteFiat();
    } else {
      currentFiat = config.validFiats.find(
        fiat => fiat.code === AvailableFiat.USD
      );
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .token-box {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto;
    grid-template-areas:
      "token-name balance actions"
      "left middle right"
      "graph graph graph";
    grid-gap: 20px;
    border: none;
    border-radius: $std-border-radius;
    background-color: $blizzard-blue;
    margin: 15px;
    padding: 20px;
    text-align: center;
    z-index: 50;

    .token-box__name {
      img {
        width: 44px;
        height: 44px;
        position: absolute;
        top: 0px;
        left: 0px;
        background-color: $blizzard-blue;
        padding: 0px;
        margin: 0px;
        border-radius: 50%;
        z-index: 100;
        animation: token-pop 1s forwards 0.3s;
      }
    }

    .token-box__graph {
      grid-area: graph;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
    }

    .token-box_expand-less {
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }

    .token-box__info__left {
      grid-area: left;
    }

    .token-box__info__middle {
      grid-area: middle;
    }
  }

  .token-box-mini {
    display: grid;
    grid-template-columns: 15% 20% 25% 30% 10%;
    align-items: center;
    border: none;
    border-radius: $std-border-radius;
    background-color: $blizzard-blue;
    margin: 10px;
    padding: 20px;
    text-align: center;

    img {
      width: 44px;
      height: 44px;
    }
  }

  .title {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .increase,
  .decrease {
    font-size: 0.9rem;
    font-weight: bold;

    span.material-icons-outlined {
      font-size: inherit;
    }
  }
  .increase {
    color: $emerald-green;
  }
  .decrease {
    color: $red;
  }

  @keyframes token-pop {
    from {
      top: 0px;
      left: 0px;
    }

    to {
      top: -20px;
      left: -20px;
    }
  }

  @media (max-width: $mobile-breakpoint) {
    .token-box-mini {
      display: flex;
      flex-direction: column;
      gap: 20px;

      .token-expand {
        display: none;
      }
    }
  }
</style>

{#if $store.tokens.hasOwnProperty(token) && userBalance}
  {#if expand}
    <div class="token-box" in:slide|local={{ duration: 500 }}>
      <div class="token-box__name">
        <img src={`tokens/${token}.png`} alt="token-logo" />
        <div class="title">
          <a
            href={`https://better-call.dev/mainnet/${$store.tokens[token].address}/operations`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {token}
          </a>
        </div>
      </div>
      <div class="title">Your balance</div>
      <div class="token-box__info__left">
        <div>
          {formatTokenAmount($store.tokens[token].getExchangeRate(), 8)} ꜩ
        </div>
        <div>
          {formatTokenAmount(
            $store.tokens[token].getExchangeRate() * $store.xtzExchangeRate,
            2
          )}
          {currentFiat.symbol}
        </div>
        {#if tokenAggregateDaily}
          <div
            class:increase={tokenAggregateDaily.increase === true}
            class:decrease={tokenAggregateDaily.increase === false}
          >
            {#if tokenAggregateDaily.increase === true}
              <span class="material-icons-outlined"> arrow_upward </span>
            {:else}
              <span class="material-icons-outlined"> arrow_downward </span>
            {/if}
            <span>
              {tokenAggregateDaily.increase ? "" : "-"}{formatTokenAmount(
                tokenAggregateDaily.difference,
                2
              )} %
            </span>
          </div>
        {/if}
      </div>
      <div class="title">Actions</div>
      <div class="token-box__info__middle">
        {#if userBalance && $store.tokens[token]}
          <div>
            {formatTokenAmount(userBalance)} tokens
          </div>
          <div>
            {formatTokenAmount(
              +userBalance * $store.tokens[token].getExchangeRate(),
              8
            )} ꜩ
          </div>
          <div>
            {formatTokenAmount(
              +userBalance *
                $store.tokens[token].getExchangeRate() *
                $store.xtzExchangeRate,
              2
            )}
            {currentFiat.symbol}
          </div>
        {:else}
          <div>Loading</div>
        {/if}
      </div>
      <div class="buttons">
        <button class="primary small">Send</button>
        <button class="primary small">Exchange</button>
      </div>
      <div class="token-box__graph">
        <div />
        <div>
          {#if tokenStatsChartData}
            <div class="token-price-change-container">
              <canvas id={`token-price-change-chart-${token}`} height="80px" />
            </div>
            <span style="font-size:0.7rem;text-align:center">
              Price changes over the last 30 days
            </span>
          {/if}
        </div>
        <div class="token-box_expand-less">
          <button
            class="transparent"
            style="float:right"
            on:click={() => (expand = !expand)}
          >
            <span class="material-icons-outlined" style="margin:0px">
              expand_less
            </span>
          </button>
        </div>
      </div>
    </div>
  {:else}
    <div class="token-box-mini" in:slide|local={{ duration: 500 }}>
      <div>
        <img src={`tokens/${token}.png`} alt="token-logo" />
      </div>
      <div>
        <div class="token-box__info__left">
          <div>
            {formatTokenAmount($store.tokens[token].getExchangeRate(), 8)} ꜩ
          </div>
          <div>
            {formatTokenAmount(
              $store.tokens[token].getExchangeRate() * $store.xtzExchangeRate,
              2
            )}
            {currentFiat.symbol}
          </div>
          {#if tokenAggregateDaily}
            <div
              class:increase={tokenAggregateDaily.increase === true}
              class:decrease={tokenAggregateDaily.increase === false}
            >
              {#if tokenAggregateDaily.increase === true}
                <span class="material-icons-outlined"> arrow_upward </span>
              {:else}
                <span class="material-icons-outlined"> arrow_downward </span>
              {/if}
              <span>
                {tokenAggregateDaily.increase ? "" : "-"}{formatTokenAmount(
                  tokenAggregateDaily.difference,
                  2
                )} %
              </span>
            </div>
          {/if}
        </div>
      </div>
      <div>
        <div>
          {#if [AvailableToken.tzBTC, AvailableToken.wWBTC, AvailableToken.BTCtz].includes(token)}
            {formatTokenAmount(userBalance, 6)} tokens
          {:else}
            {formatTokenAmount(userBalance)} tokens
          {/if}
        </div>
        <div>
          {formatTokenAmount(
            userBalance * $store.tokens[token].getExchangeRate()
          )} ꜩ
        </div>
        <div>
          {formatTokenAmount(
            userBalance *
              $store.tokens[token].getExchangeRate() *
              $store.xtzExchangeRate,
            2
          )}
          {currentFiat.symbol}
        </div>
      </div>
      <div class="buttons">
        <button class="primary">Send</button>
        <button class="primary">Exchange</button>
      </div>
      <div class="token-expand">
        <button
          class="transparent"
          style="float:right"
          on:click={() => (expand = !expand)}
        >
          <span class="material-icons-outlined" style="margin:0px">
            expand_more
          </span>
        </button>
      </div>
    </div>
  {/if}
{/if}
