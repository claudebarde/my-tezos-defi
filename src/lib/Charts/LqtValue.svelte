<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import moment from "moment";
  import store from "../../store";
  import config from "../../config";
  import { lqtOutput } from "../../utils";

  let chart;
  let showCanvas = false;
  let lastLevel = 0;

  afterUpdate(async () => {
    if ($store.lastOperations.length > 0) {
      // gets current level
      const currentLevel = $store.lastOperations[0].level;
      if (currentLevel !== lastLevel) {
        lastLevel = currentLevel;
        showCanvas = true;
        // calculates levels to request
        const hoursGap = 12;
        const levelGap = hoursGap * (2 * 60);
        let previousLevel = currentLevel;
        let levelTimestamp = Math.round(Date.now() / 1000);
        const levelsToRequest: { level: number; timestamp: number }[] = [
          { level: currentLevel, timestamp: levelTimestamp }
        ];
        for (let i = 0; i < hoursGap; i++) {
          const level = previousLevel - levelGap;
          levelTimestamp = levelTimestamp - hoursGap * 60 * 60;
          levelsToRequest.unshift({
            level,
            timestamp: levelTimestamp
          });
          previousLevel = level;
        }
        const lbContractAddress = config.lbContracts[0];
        const storages = await Promise.all(
          levelsToRequest.map(level =>
            fetch(
              `https://api.tzkt.io/v1/contracts/${lbContractAddress}/storage?level=${level.level}`
            )
              .then(storageResponse => storageResponse.json())
              .then(storage => ({ ...storage, level }))
              .catch(err => undefined)
          )
        );
        // calculates lqt value
        const lqtValues = storages.map(storage => {
          const val = lqtOutput({
            lqTokens: 100,
            pool: +storage.xtzPool,
            lqtTotal: +storage.lqtTotal,
            decimals: 6
          });

          return val * 2;
        });
        // creates the data for the chart
        let data = {
          labels: levelsToRequest.map(level =>
            moment.unix(level.timestamp).format("MM-DD-YYYY hh:mm A")
          ),
          datasets: [
            {
              label: "Liquidity Baking Token Value (for 100 tokens)",
              data: lqtValues,
              borderColor: "rgb(75, 192, 192)",
              hoverOffset: 4
            }
          ]
        };
        // sets up the chart
        const canvas = document.getElementById(
          "lqt-value-chart"
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
              scales: {
                x: { title: { display: true, text: "Time" } },
                y: { title: { display: true, text: "Value in XTZ" } }
              }
            }
          });
        }
      }
    }
  });

  /*afterUpdate(() => {
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
    });*/
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .container-chart {
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

{#if showCanvas}
  <div class="container-chart">
    <canvas id="lqt-value-chart" width="800" height="300" />
  </div>
{/if}
