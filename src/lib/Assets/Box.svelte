<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import moment from "moment";
  import type { AvailableToken, TokenContract } from "../../types";
  import store from "../../store";
  import historicDataStore from "../../historicDataStore";
  import Modal from "../Modal/Modal.svelte";

  export let assetsType: "owned" | "general",
    token: [AvailableToken | string, TokenContract],
    balancesInUsd;

  let nrOfTrends = 0;
  let trend: "up" | "down" | "same" | undefined = undefined;
  let trendModalOpen = false;

  /*const dummyChartData = {
    data: [
      0.68285, 0.68289, 0.68272, 0.68276, 0.68276, 0.70503, 0.68465, 0.70503,
      0.68465, 0.68465, 0.68529, 0.68465, 0.68465, 0.68456, 0.70503, 0.68285,
      0.68285
    ],
    labels: [
      1623579173813, 1623579115483, 1623578873849, 1623578696772, 1623578514008,
      1623578396486, 1623578204343, 1623578274545, 1623578331284, 1623578458646,
      1623578574012, 1623578634964, 1623578760747, 1623578815591, 1623578935036,
      1623578996617, 1623579056394
    ]
  };*/

  const calculateTrend = () => {
    trendModalOpen = true;
    // gets canvas
    const tokenData = $historicDataStore.tokens[token[0]];
    tokenData.sort((a, b) => a.timestamp - b.timestamp);
    const data = tokenData.map(el => +el.rate.tokenToTez);
    //const labels = tokenData.map(el => new Date(el.timestamp).toISOString());
    const labels = tokenData.map(el =>
      moment(el.timestamp).format("MMM Do YYYY, HH:mm:ss")
    );
    setTimeout(() => {
      const canvas = document.getElementById("trendChart") as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      // sets width
      /*canvas.width =
        $historicDataStore.tokens[token[0]].length < 20
          ? 200
          : $historicDataStore.tokens[token[0]].length * 20;
      canvas.height = 200;*/
      // creates new chart
      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data,
              label: token[0],
              borderColor: "#3e95cd",
              fill: false
            }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }, 100);
  };

  afterUpdate(() => {
    if (
      $historicDataStore.tokens[token[0]].length > 2 &&
      $historicDataStore.tokens[token[0]].length !== nrOfTrends
    ) {
      // calculates new trend
      const tokenData = $historicDataStore.tokens[token[0]];
      tokenData.sort((a, b) => a.timestamp - b.timestamp);
      const upsAndDowns = tokenData.map((el, index) => {
        if (index === 0) {
          // first element of the array, nothing to do with it
          return null;
        } else {
          const previousEl = tokenData[index - 1];
          if (+el.rate.tokenToTez === +previousEl.rate.tokenToTez) {
            return "same";
          } else if (+el.rate.tokenToTez > +previousEl.rate.tokenToTez) {
            // price went up
            return "up";
          } else {
            return "down";
          }
        }
      });
      const counts = upsAndDowns.reduce(
        (prev, cur) => {
          prev[cur] = (prev[cur] || 0) + 1;
          return prev;
        },
        { up: 0, down: 0, same: 0 }
      );
      if (counts.up === counts.down) {
        trend = "same";
      } else if (counts.up > counts.down) {
        trend = "up";
      } else {
        trend = "down";
      }
      nrOfTrends = $historicDataStore.tokens[token[0]].length;
      /*console.log(
        token[0],
        $historicDataStore.tokens[token[0]],
        upsAndDowns,
        counts,
        trend
      );*/
    }
  });
</script>

<style lang="scss">
  .box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 10px;
    margin: 10px;
    min-width: 180px;

    .icon {
      padding: 10px;
      img {
        width: 50px;
        height: 50px;
      }
    }

    .info {
      display: flex;
      flex-direction: column;
      text-align: center;
    }

    .trend {
      display: flex;
      justify-content: center;
      align-items: center;

      .material-icons.up {
        color: #10b981;
      }
      .material-icons.down {
        color: #ef4444;
      }
      .material-icons.same {
        color: #6b7280;
      }

      .trend-button {
        appearance: none;
        display: flex;
        justify-content: center;
        align-items: center;
        border: solid 2px transparent;
        border-radius: 10px;
        background-color: transparent;
        color: white;
        font-size: 1rem;
        font-family: "Signika", sans-serif;
        margin: 5px;
        transition: 0.3s;

        &:hover {
          cursor: pointer;
          border-color: #4b5563;
        }
      }
    }
  }
</style>

<div class="box">
  <div class="icon">
    <img src={`images/${token[0]}.png`} alt={token[0]} />
  </div>
  {#if $store.firstLoading}
    <div class="info">Loading...</div>
  {:else}
    <div class="info">
      {#if $store.tokensExchangeRates[token[0]]}
        <div>
          1 XTZ = {$store.tokensExchangeRates[token[0]].tezToToken}
          {token[0]}
        </div>
        <div>
          1 {token[0]} = {$store.tokensExchangeRates[token[0]].tokenToTez}
          XTZ
        </div>
      {:else}
        <div>No data</div>
      {/if}
    </div>
    {#if assetsType === "owned"}
      <div class="info">
        <div>
          Balance: {+$store.tokensBalances[token[0]].toFixed(5) / 1}
        </div>
        {#if $store.tokensExchangeRates[token[0]]}
          <div>
            {balancesInUsd[token[0]]
              ? balancesInUsd[token[0]].toFixed(2) / 1
              : ""} USD
          </div>
        {:else}
          <div>N/A</div>
        {/if}
      </div>
    {/if}
    {#if trend}
      <div class="trend">
        <button class="trend-button" on:click={calculateTrend}>
          Trend:
          {#if trend === "same"}
            <span class="material-icons same"> trending_flat </span>
          {:else if trend === "up"}
            <span class="material-icons up"> trending_up </span>
          {:else}
            <span class="material-icons down"> trending_down </span>
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>
{#if trendModalOpen}
  <Modal on:close={() => (trendModalOpen = false)}>
    <div slot="modal-title" class="modal-title">
      {token[0]} -> XTZ Price Trend
    </div>
    <div slot="modal-body" class="modal-body">
      <canvas id="trendChart" width="400" height="300" />
    </div>
    <div slot="modal-footer" class="modal-footer">
      <button
        class="default"
        on:click={() => {
          trendModalOpen = false;
        }}
      >
        Close
      </button>
    </div>
  </Modal>
{/if}
