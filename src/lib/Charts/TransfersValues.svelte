<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import { validateAddress } from "@taquito/utils";
  import store from "../../store";
  import type { AvailableToken } from "../../types";

  let chart;
  let showCanvas = false;

  afterUpdate(() => {
    if (
      $store.tokensExchangeRates &&
      $store.lastOperations.length > 1 &&
      Object.values($store.tokensExchangeRates).every(val => val)
    ) {
      showCanvas = true;
      let data = {
        labels: [],
        datasets: [
          {
            label: "Total value in XTZ",
            data: [],
            backgroundColor: [],
            hoverOffset: 4
          }
        ]
      };

      const currentLevel = $store.lastOperations[0].level;
      $store.lastOperations
        .filter(op => op.level > currentLevel - 10)
        .reverse()
        .forEach(op => {
          if (op.raw?.parameter?.entrypoint === "transfer") {
            const { value } = op.raw.parameter;
            const findToken = Object.entries($store.tokens).find(
              ([_, info]) => info.address === op.raw.target.address
            );
            if (findToken) {
              const tokenSymbol: AvailableToken =
                findToken[0] as AvailableToken;
              const tokenDecimals = findToken[1].decimals;
              let valueInToken = 0;
              let valueInXtz = 0;
              if (Array.isArray(value)) {
                // FA2
                value.forEach(op => {
                  op.txs.forEach(tx => {
                    valueInToken = +tx.amount / 10 ** tokenDecimals;
                    valueInXtz = $store.tokensExchangeRates[tokenSymbol]
                      ? valueInToken *
                        $store.tokensExchangeRates[tokenSymbol].tokenToTez
                      : 0;
                  });
                });
              } else if (
                value.to &&
                value.from &&
                value.value &&
                $store.tokensExchangeRates[tokenSymbol]
              ) {
                // FA1.2
                valueInToken = +value.value / 10 ** tokenDecimals;
                valueInXtz =
                  valueInToken *
                  $store.tokensExchangeRates[tokenSymbol].tokenToTez;
              }

              if (valueInXtz > 0) {
                if (data.labels.includes(op.level)) {
                  const index = data.labels.indexOf(op.level);
                  data.datasets[0].data[index] += valueInXtz;
                } else {
                  data.labels.push(op.level);
                  data.datasets[0].data.push(valueInXtz);
                }
              }
            }
          } else if (
            !op.raw.hasOwnProperty("parameter") &&
            (validateAddress(op.target.address) ||
              validateAddress(op.sender.address)) &&
            !isNaN(+op.amount)
          ) {
            if (+op.amount > 0) {
              if (data.labels.includes(op.level)) {
                const index = data.labels.indexOf(op.level);
                data.datasets[0].data[index] += +op.amount / 10 ** 6;
              } else {
                data.labels.push(op.level);
                data.datasets[0].data.push(+op.amount / 10 ** 6);
              }
            }
          }
        });
      //console.log(JSON.stringify(data, null, 2));

      if (data.datasets[0].data.length > 0) {
        showCanvas = true;
      } else {
        showCanvas = false;
      }

      const canvas = document.getElementById(
        "transfers-values-chart"
      ) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (chart) chart.destroy();

        // calculates average and assigns colors
        let averageValue = 0;
        if (data.datasets[0].data.length === 1) {
          averageValue = data.datasets[0].data[0];
        } else if (data.datasets[0].data.length > 1) {
          averageValue =
            data.datasets[0].data.reduce((a, b) => +a + +b) /
            data.datasets[0].data.length;
        }
        data.datasets[0].data.forEach(val => {
          if (val < averageValue) {
            data.datasets[0].backgroundColor.push("#60A5FA");
          } else {
            data.datasets[0].backgroundColor.push("#F87171");
          }
        });

        chart = new Chart(ctx, {
          type: "bar",
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Total value transferred per block`
              },
              legend: { display: false }
            },
            scales: {
              x: { title: { display: true, text: "Level" } },
              y: { title: { display: true, text: "Value in XTZ" } }
            }
          }
        });
      }
    } else {
      showCanvas = false;
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .container-chart {
    padding: 10px;

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

{#if showCanvas}
  <div class="container-chart">
    <canvas id="transfers-values-chart" width="800" height="300" />
  </div>
{/if}
