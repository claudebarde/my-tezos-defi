<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import moment from "moment";
  import type { AvailableToken, TokenContract } from "../../types";
  import store from "../../store";
  import historicDataStore from "../../historicDataStore";
  import Modal from "../Modal/Modal.svelte";
  import { calculateTrend } from "../../utils";

  export let assetsType: "owned" | "general",
    token: [AvailableToken | string, TokenContract] | "tez",
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

  const displayTrendGraph = () => {
    trendModalOpen = true;
    // gets canvas
    let tokenData = $historicDataStore.tokens[token[0]].slice(0);
    tokenData.sort((a, b) => a.timestamp - b.timestamp);
    //tokenData = tokenData.slice(-60);
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

  afterUpdate(async () => {
    if (token !== "tez") {
      if (
        $historicDataStore.tokens[token[0]].length > 2 &&
        $historicDataStore.tokens[token[0]].length !== nrOfTrends
      ) {
        const newTrend = calculateTrend(
          $historicDataStore,
          token[0] as AvailableToken
        );
        trend = newTrend.trend;
        nrOfTrends = newTrend.nrOfTrends;
      }
    } else {
      if ($store.userAddress && $store.tezBalance === 0) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
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
      a {
        text-decoration: none;

        img {
          width: 50px;
          height: 50px;
        }
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
    <a href={`/#/token/${token === "tez" ? "XTZ" : token[0]}`}>
      <img
        src={`images/${token === "tez" ? "XTZ" : token[0]}.png`}
        alt={token[0]}
      />
    </a>
  </div>
  {#if $store.firstLoading}
    <div class="info">Loading...</div>
  {:else}
    <div class="info">
      <!-- if XTZ-->
      {#if token === "tez" && $store.xtzFiatExchangeRate}
        <div>
          1 XTZ = {$store.xtzFiatExchangeRate} USD
        </div>
        <div>
          1 USD = {+($store.xtzFiatExchangeRate / 100).toFixed(5) / 1} XTZ
        </div>
      {:else if token === "tez" && !$store.xtzFiatExchangeRate}
        <div>No data</div>
      {/if}
      <!-- if other token-->
      {#if token !== "tez" && $store.tokensExchangeRates[token[0]]}
        <div>
          1 XTZ = {$store.tokensExchangeRates[token[0]].tezToToken}
          {token[0]}
        </div>
        <div>
          1 {token[0]} = {$store.tokensExchangeRates[token[0]].tokenToTez}
          XTZ
        </div>
      {:else if token !== "tez" && !$store.tokensExchangeRates[token[0]]}
        <div>No data</div>
      {/if}
    </div>
    {#if assetsType === "owned" && token !== "tez"}
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
    {:else if assetsType === "owned" && token === "tez"}
      <div class="info">
        <div>
          Balance: {+($store.tezBalance / 10 ** 6).toFixed(5) / 1}
        </div>
        {#if $store.xtzFiatExchangeRate}
          <div>
            {+(
              ($store.tezBalance / 10 ** 6) *
              $store.xtzFiatExchangeRate
            ).toFixed(5) / 1} USD
          </div>
        {:else}
          <div>N/A</div>
        {/if}
      </div>
    {/if}
    {#if trend}
      <div class="trend">
        <button class="trend-button" on:click={displayTrendGraph}>
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
  <Modal type="graph" on:close={() => (trendModalOpen = false)}>
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
