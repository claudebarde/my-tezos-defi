<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import type { AvailableToken } from "../../types";
  import store from "../../store";

  export let chartData: [
      AvailableToken,
      { timestamp: string; price: number }[]
    ][],
    priceSize: "small" | "medium" | "large" | "huge";

  let chart;
  const randomId = (Math.random() + 1).toString(36).substring(7);

  const generateChart = () => {
    const processedChartData = chartData.filter(([tokenId, tokenInfo]) =>
      [
        true,
        true,
        ...tokenInfo.map(info => {
          if (priceSize === "small") {
            return info.price <= 0.1;
          } else if (priceSize === "medium") {
            return info.price <= 1 && info.price > 0.1;
          } else if (priceSize === "large") {
            return info.price > 1 && !["wWBTC", "tzBTC"].includes(tokenId);
          } else if (priceSize === "huge") {
            return ["wWBTC", "tzBTC"].includes(tokenId);
          }
        })
      ].reduce((a, b) => a && b)
    );
    if (processedChartData.length > 0) {
      let data = {
        labels: [],
        tooltipText: [],
        datasets: [
          /*{
          label: "Tokens Price Change (last 30 days)",
          data: [],
          backgroundColor: [],
          hoverOffset: 4
        }*/
        ]
      };

      data.labels = [
        ...processedChartData[0][1].map(info =>
          info.timestamp.replace(/T.*Z/, "")
        )
      ];
      processedChartData.forEach(item => {
        const [tokenId, tokenInfo] = item;

        data.datasets.push({
          label: tokenId,
          data: [...tokenInfo.map(info => info.price)],
          backgroundColor: [$store.tokens[tokenId].color],
          borderColor: $store.tokens[tokenId].color,
          hoverOffset: 4,
          tension: 0.1,
          pointStyle: "line"
        });
      });

      /*totalValueInFarms
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
      });*/
      const canvas = document.getElementById(
        `tokens-price-change-chart-${randomId}`
      ) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (chart) chart.destroy();

        let legendText = "";
        switch (priceSize) {
          case "small":
            legendText = "Tokens price change with price under 0.1 XTZ";
            break;
          case "medium":
            legendText = "Tokens price change with price under 1 XTZ";
            break;
          case "large":
            legendText = "Tokens price change with price over 1 XTZ";
            break;
          case "huge":
            legendText = "Tokens price change for BTC-backed tokens";
            break;
        }

        chart = new Chart(ctx, {
          type: "line",
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: legendText
              },
              tooltip: {
                callbacks: {
                  title: function (tooltipItem) {
                    return `${tooltipItem[0].dataset.label} on ${tooltipItem[0].label}`;
                  },
                  label: function (tooltipItem) {
                    return `Price: ${tooltipItem.formattedValue} XTZ`;
                  }
                }
              }
            },
            scales: {
              x: { title: { display: true, text: "Days" } },
              y: { title: { display: true, text: "Value in XTZ" } }
            }
          }
        });
      }
    }
  };

  afterUpdate(() => {
    if (chartData.length > 0 && !chart) {
      generateChart();
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .tokens-price-change-container {
    padding: 10px;
    width: 100%;

    canvas {
      background-color: white;
      width: 100% !important;
      margin: 0 auto;
    }
  }

  @media only screen and (max-width: $mobile-break-point) {
    canvas {
      width: 100% !important;
    }
  }
</style>

<div class="tokens-price-change-container">
  <canvas
    id={`tokens-price-change-chart-${randomId}`}
    width="1000"
    height="600"
  />
</div>
