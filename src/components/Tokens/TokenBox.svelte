<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import type { AvailableToken } from "../../types";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";
  import localStorageStore from "../../localStorage";

  export let token: AvailableToken | "XTZ",
    tokensStatsWeekly:
      | {
          difference: number;
          increase: boolean;
        }
      | undefined, // undefined if XTZ
    tokensStatsDaily:
      | {
          difference: number;
          increase: boolean;
        }
      | undefined, // undefined if XTZ
    monthlyChartData: { timestamp: string; price: number }[] | undefined; // undefined if XTZ

  let chart;

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

  afterUpdate(() => {
    if (
      token !== "XTZ" &&
      monthlyChartData &&
      monthlyChartData.length === 30 &&
      !chart
    ) {
      generateChart(monthlyChartData);
    } else if (
      token === "XTZ" &&
      $store.xtzData.historic &&
      $store.xtzData.historic.length > 0 &&
      !chart
    ) {
      generateChart($store.xtzData.historic);
      const dailyIncrease =
        $store.xtzData.historic[$store.xtzData.historic.length - 2].price <
        $store.xtzData.exchangeRate;
      const dailyDifference = (() => {
        const priceBefore =
          $store.xtzData.historic[$store.xtzData.historic.length - 2].price;
        const currentPrice = $store.xtzData.exchangeRate;
        const difference =
          (priceBefore - currentPrice) / ((priceBefore + currentPrice) / 2);
        return Math.abs(difference * 100);
      })();
      const monthlyIncrease =
        $store.xtzData.historic[$store.xtzData.historic.length - 30].price <
        $store.xtzData.exchangeRate;
      const monthlyDifference = (() => {
        const priceBefore =
          $store.xtzData.historic[$store.xtzData.historic.length - 30].price;
        const currentPrice = $store.xtzData.exchangeRate;
        const difference =
          (priceBefore - currentPrice) / ((priceBefore + currentPrice) / 2);
        return Math.abs(difference * 100);
      })();
      tokensStatsDaily = {
        increase: dailyIncrease,
        difference: dailyDifference
      };
      tokensStatsWeekly = {
        increase: monthlyIncrease,
        difference: monthlyDifference
      };
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .favorite-token {
    display: grid;
    row-gap: 10px;
    width: 250px;
    border: solid 1px $bg-color;
    border-radius: 10px;
    padding: 1rem 10px;
    position: relative;
    z-index: 10;

    img {
      height: 2.4rem;
      position: absolute;
      top: -1.4rem;
      left: 10px;
      background-color: white;
      padding: 0px 3px;
    }

    .favorite-token__price {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .favorite-token__stats {
      border-top: solid 1px $bg-color;
      padding: 10px 10px 0px 10px;
      font-size: 0.8rem;
    }
  }
</style>

{#if token === "XTZ"}
  <div class="favorite-token">
    <img src="images/XTZ.png" alt="XTZ-logo" />
    <div>XTZ</div>
    <div>
      <div>{formatTokenAmount($store.xtzData.balance / 10 ** 6)}</div>
      <div>
        {+(
          ($store.xtzData.balance / 10 ** 6) *
          $store.xtzData.exchangeRate
        ).toFixed(2) / 1}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
    <div class="favorite-token__stats">
      {#if tokensStatsDaily}
        <div>
          Price change (24 h):
          <span style={`color:${tokensStatsDaily.increase ? "green" : "red"}`}>
            {tokensStatsDaily.increase
              ? "+"
              : "-"}{tokensStatsDaily.difference.toFixed(2)}%
          </span>
        </div>
      {/if}
      {#if tokensStatsWeekly}
        <div>
          Price change (7 d):
          <span style={`color:${tokensStatsWeekly.increase ? "green" : "red"}`}>
            {tokensStatsWeekly.increase
              ? "+"
              : "-"}{tokensStatsWeekly.difference.toFixed(2)}%
          </span>
        </div>
      {/if}
    </div>
    {#if $store.xtzData.historic}
      <div class="token-price-change-container">
        <canvas
          id={`token-price-change-chart-${token}`}
          width="250"
          height="70"
        />
      </div>
    {/if}
    <span style="font-size:0.5rem;text-align:center">
      Price changes over the last 30 days
    </span>
  </div>
{:else}
  <div class="favorite-token">
    <img src={`images/${token}.png`} alt={`${token}-logo`} />
    <div class="favorite-token__price">
      <div>
        <div>{token}</div>
        <div style="font-size:0.8rem">
          {formatTokenAmount($store.tokens[token].exchangeRate)} ꜩ
        </div>
      </div>
      <div>
        {#if $store.tokensBalances && !isNaN($store.tokensBalances[token]) && $store.xtzData.exchangeRate}
          <div>
            {#if formatTokenAmount($store.tokensBalances[token]) === 0}
              No balance
            {:else}
              {formatTokenAmount($store.tokensBalances[token])}
            {/if}
          </div>
          {#if $store.tokensBalances && formatTokenAmount($store.tokensBalances[token]) === 0}
            <div />
            <div />
            <div />
          {:else}
            <div>
              {+(
                $store.tokensBalances[token] * $store.tokens[token].exchangeRate
              ).toFixed(3) / 1} ꜩ
            </div>
            {#if $localStorageStore}
              <div>
                {+(
                  $store.tokensBalances[token] *
                  $store.tokens[token].exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2) / 1}
                {$localStorageStore.preferredFiat}
              </div>
            {:else}
              <div>
                {+(
                  $store.tokensBalances[token] *
                  $store.tokens[token].exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2) / 1} USD
              </div>
            {/if}
          {/if}
        {:else}
          <div>---</div>
          <div>---</div>
        {/if}
      </div>
    </div>
    {#if tokensStatsWeekly || tokensStatsDaily}
      <div class="favorite-token__stats">
        {#if tokensStatsDaily}
          <div>
            Price change (24 h):
            <span
              style={`color:${tokensStatsDaily.increase ? "green" : "red"}`}
            >
              {tokensStatsDaily.increase
                ? "+"
                : "-"}{tokensStatsDaily.difference.toFixed(2)}%
            </span>
          </div>
        {/if}
        {#if tokensStatsWeekly}
          <div>
            Price change (7 d):
            <span
              style={`color:${tokensStatsWeekly.increase ? "green" : "red"}`}
            >
              {tokensStatsWeekly.increase
                ? "+"
                : "-"}{tokensStatsWeekly.difference.toFixed(2)}%
            </span>
          </div>
        {/if}
      </div>
    {/if}
    {#if monthlyChartData}
      <div class="token-price-change-container">
        <canvas
          id={`token-price-change-chart-${token}`}
          width="250"
          height="70"
        />
      </div>
      <span style="font-size:0.5rem;text-align:center">
        Price changes over the last 30 days
      </span>
    {/if}
  </div>
{/if}
