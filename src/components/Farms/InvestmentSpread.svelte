<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import store from "../../store";
  import { AvailableInvestments, AvailableToken } from "../../types";

  export let totalValueInFarms: [AvailableInvestments, number][];

  let chart;
  let totalValue = 0;

  const generateChart = () => {
    let data = {
      labels: [],
      tooltipText: [],
      datasets: [
        {
          label: "Investment Spread (farms with over 1%)",
          data: [],
          backgroundColor: [],
          hoverOffset: 4
        }
      ]
    };

    totalValueInFarms
      .sort((a, b) => b[1] - a[1])
      .forEach(inv => {
        let percent = (+inv[1] / totalValue) * 100;
        if (percent > 1) {
          data.labels.push($store.investments[inv[0]].alias);
          data.datasets[0].data.push(inv[1]);

          if ($store.investments[inv[0]].platform === "plenty") {
            if ($store.investments[inv[0]].icons[0] === AvailableToken.PLENTY) {
              data.datasets[0].backgroundColor.push($store.tokens.PLENTY.color);
            } else if (
              $store.investments[inv[0]].icons[0] === AvailableToken.Ctez
            ) {
              data.datasets[0].backgroundColor.push($store.tokens.Ctez.color);
            }
          } else if ($store.investments[inv[0]].platform === "paul") {
            data.datasets[0].backgroundColor.push($store.tokens.PAUL.color);
          } else if ($store.investments[inv[0]].platform === "wrap") {
            data.datasets[0].backgroundColor.push($store.tokens.WRAP.color);
          }
        }
      });

    const canvas = document.getElementById(
      "investment-spread-chart"
    ) as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (chart) chart.destroy();

      chart = new Chart(ctx, {
        type: "bar",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Investment Spread (farms with over 1%)`
            },
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: function (tooltipItem) {
                  return tooltipItem[0].label;
                },
                label: function (tooltipItem) {
                  return `${+tooltipItem.raw.toFixed(3) / 1} XTZ (${
                    +((+tooltipItem.raw / totalValue) * 100).toFixed(2) / 1
                  }%)`;
                }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: "Farms" } },
            y: { title: { display: true, text: "Value in XTZ" } }
          }
        }
      });
    }
  };

  afterUpdate(() => {
    if ($store.tokens && totalValueInFarms.length > 1) {
      const value = [0, ...totalValueInFarms.map(([_, val]) => val)].reduce(
        (a, b) => a + b
      );
      if (value !== totalValue) {
        totalValue = value;
        generateChart();
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .investment-spread-container {
    padding: 10px;
    width: 100%;

    canvas {
      background-color: white;
      width: 80% !important;
      margin: 0 auto;
    }
  }

  @media only screen and (max-width: $mobile-break-point) {
    canvas {
      width: 100% !important;
    }
  }
</style>

<div class="investment-spread-container">
  <canvas id="investment-spread-chart" width="800" height="300" />
</div>
