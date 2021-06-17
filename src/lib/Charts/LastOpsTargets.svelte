<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import store from "../../store";
  import { shortenHash } from "../../utils";

  let chart;
  let lastLevel = 0;
  let showCanvas = true;

  afterUpdate(() => {
    showCanvas = true;
    if (
      $store.lastOperations.length > 1 &&
      lastLevel !== $store.lastOperations[0].level
    ) {
      let data = {
        labels: [],
        datasets: [
          {
            label: "Last operations",
            data: [],
            backgroundColor: [],
            hoverOffset: 4
          }
        ]
      };
      // process data
      let tempOpsCount = {};
      $store.lastOperations.forEach(op => {
        if (!op.target.alias) {
          op.target.alias = shortenHash(op.target.address);
        }

        if (!tempOpsCount.hasOwnProperty(op.target.alias)) {
          tempOpsCount[op.target.alias] = 1;
        } else {
          tempOpsCount[op.target.alias] += 1;
        }
      });
      const threshold = 5;
      Object.entries(tempOpsCount).forEach(([target, opsCount]) => {
        if (opsCount >= threshold) {
          data.labels.push(target);
          data.datasets[0].data.push(opsCount);

          let barColor = "#3B82F6";
          if (
            target.toLowerCase().includes("plenty") &&
            target.toLowerCase() !== "quipuswap plenty"
          ) {
            barColor = $store.tokens["PLENTY"].color;
          } else if (target.toLowerCase() === "wrapped tokens contract") {
            barColor = $store.tokens["WRAP"].color;
          } else if (target.toLowerCase() === "hdao") {
            barColor = $store.tokens["hDAO"].color;
          } else if (target.toLowerCase().split(" ")[0] === "quipuswap") {
            barColor = "#575FE6";
          }
          data.datasets[0].backgroundColor.push(barColor);
        }
      });

      lastLevel = $store.lastOperations[0].level;
      const canvas = document.getElementById(
        "last-ops-targets-chart"
      ) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (chart) chart.destroy();

        if (data.datasets[0].data.length > 0) {
          showCanvas = true;
        } else {
          showCanvas = false;
        }

        chart = new Chart(ctx, {
          type: "doughnut",
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Contracts in the last 5 blocks with more than ${threshold} transactions`
              },
              legend: { position: "left" }
            }
          }
        });
      }
    }
  });
</script>

<style lang="scss">
  .container-chart {
    padding: 10px;

    canvas {
      background-color: white;
      width: 80% !important;
      margin: 0 auto;
    }
  }
</style>

<div class="container-chart">
  {#if showCanvas}
    <canvas id="last-ops-targets-chart" width="800" height="300" />
  {:else}
    <span>No data yet</span>
  {/if}
</div>
