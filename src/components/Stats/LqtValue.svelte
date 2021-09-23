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
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .lqt-container {
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
  <div class="lqt-container">
    <canvas id="lqt-value-chart" width="800" height="300" />
  </div>
{/if}
