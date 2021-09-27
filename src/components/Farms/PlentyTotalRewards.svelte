<script lang="ts">
  import { onMount } from "svelte";
  import Chart from "chart.js/auto";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { formatTokenAmount } from "../../utils";

  let chart;
  let showCanvas = true;

  onMount(async () => {
    if ($localStorageStore && $store?.investments) {
      const plentyInvestments = $localStorageStore.favoriteInvestments
        .map(inv =>
          $store.investments.hasOwnProperty(inv) &&
          $store.investments[inv].platform === "plenty"
            ? $store.investments[inv]
            : undefined
        )
        .filter(el => el);
      const plentyRewards = await Promise.all(
        plentyInvestments.map(async inv => {
          let operations = [];
          try {
            const operationsRes = await fetch(
              `https://api.tzkt.io/v1/accounts/${
                $store.userAddress
              }/operations?type=transaction&sender=${inv.address}&target=${
                $store.tokens.PLENTY.address
              }&entrypoint=transfer&level.gt=${
                $store.currentLevel - 86400
              }&limit=200&status=applied`
            );
            operations = await operationsRes.json();
            operations = operations.map(op => ({
              level: op.level,
              timestamp: op.timestamp,
              value: +op.parameter.value.value
            }));
          } catch (err) {
            console.log(err);
          }

          return {
            ...inv,
            operations
          };
        })
      );
      // creates chart
      let data = {
        labels: [],
        datasets: [
          {
            label: "Total withdrawn rewards",
            data: [],
            backgroundColor: [],
            hoverOffset: 4
          }
        ]
      };
      let totalPlentyRewards = 0;
      plentyRewards.forEach((rw: any) => {
        const totalValue = formatTokenAmount(
          [0, 0, ...rw.operations.map(op => op.value)].reduce((a, b) => a + b) /
            10 ** $store.tokens.PLENTY.decimals
        );
        totalPlentyRewards += totalValue;

        data.labels.push(rw.alias);
        data.datasets[0].data.push(totalValue);
        data.datasets[0].backgroundColor.push($store.tokens[rw.icons[1]].color);
      });
      const canvas = document.getElementById(
        "plenty-total-rewards-chart"
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
                text: `Total rewards withdrawn from Plenty farms in the last 30 days (${(
                  +totalPlentyRewards.toFixed(2) / 1
                ).toLocaleString("en-US")} PLENTY)`
              },
              legend: { position: "left" },
              tooltip: {
                callbacks: {
                  title: function (tooltipItem) {
                    return tooltipItem[0].label;
                  },
                  label: function (tooltipItem) {
                    return tooltipItem.formattedValue + " PLENTY";
                  }
                }
              }
            }
          }
        });
      }
    }
  });
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

<div class="container-chart">
  {#if showCanvas}
    <canvas id="plenty-total-rewards-chart" width="800" height="300" />
  {:else}
    <span>No data yet</span>
  {/if}
</div>
