<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import moment from "moment";
  import type { AvailableToken, TokenContract } from "../../types";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import historicDataStore from "../../historicDataStore";
  import Modal from "../Modal/Modal.svelte";
  import { calculateTrend } from "../../utils";

  export let assetsType: "favorite" | "general" | "others",
    token: [AvailableToken | string, TokenContract] | "tez";

  let nrOfTrends = 0;
  let trend: "up" | "down" | "same" | undefined = undefined;
  let trendModalOpen = false;
  let loadingExchangeRates = true;
  let localBalance: number | undefined = undefined;
  let newTransferIn = false;
  let newTransferOut = false;

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
    let tokenData =
      token === "tez"
        ? $store.xtzData.historic
        : $historicDataStore.tokens[token[0]].slice(0);
    tokenData.sort((a, b) => a.timestamp - b.timestamp);
    //tokenData = tokenData.slice(-60);
    let data = tokenData.map(el =>
      token === "tez" ? +el.rate : +el.rate.tokenToTez
    );
    //const labels = tokenData.map(el => new Date(el.timestamp).toISOString());
    let labels = tokenData.map(el =>
      moment(el.timestamp).format("MMM Do YYYY, HH:mm:ss")
    );
    setTimeout(() => {
      const canvas = document.getElementById("trendChart") as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (labels.length > 100 && token !== "tez") {
        labels = labels.filter((_, i) => i % 5 === 0);
        data = data.filter((_, i) => i % 5 === 0);
      }
      // creates new chart
      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              data,
              label: token === "tez" ? "XTZ" : token[0],
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
        $historicDataStore.tokens.hasOwnProperty(token[0]) &&
        $historicDataStore.tokens[token[0]].length > 2 &&
        $historicDataStore.tokens[token[0]].length !== nrOfTrends
      ) {
        const newTrend = calculateTrend(
          $historicDataStore.tokens[token[0]],
          token[0] as AvailableToken
        );
        trend = newTrend.trend;
        nrOfTrends = newTrend.nrOfTrends;
      }

      if (localBalance === undefined) {
        if ($store.tokensBalances[token[0]]) {
          localBalance = $store.tokensBalances[token[0]];
        } else {
          localBalance = 0;
        }
      }
      if (
        localBalance !== undefined &&
        $store.tokensBalances[token[0]] &&
        $store.tokensBalances[token[0]] !== localBalance
      ) {
        if ($store.tokensBalances[token[0]] > localBalance) {
          newTransferIn = true;
          newTransferOut = false;
          setTimeout(() => (newTransferIn = false), 4000);
        } else {
          newTransferOut = true;
          newTransferIn = false;
          setTimeout(() => (newTransferOut = false), 4000);
        }
        localBalance = $store.tokensBalances[token[0]];
      }
    } else {
      // calculate tez trend
      loadingExchangeRates = false;
      if (
        $store.xtzData.historic.length > 0 &&
        Date.now() - 60_000 > $store.xtzData.historic[0].timestamp
      ) {
        const newTrend = calculateTrend($store.xtzData.historic, "XTZ");
        trend = newTrend.trend;
        nrOfTrends = newTrend.nrOfTrends;
      }
      if ($store.userAddress && $store.xtzData.balance === 0) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
    }

    if ($store.tokensExchangeRates && $store.tokensExchangeRates[token[0]]) {
      loadingExchangeRates = false;
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
    position: relative;
    z-index: 1;

    .icon {
      position: relative;
      padding: 10px;
      a {
        text-decoration: none;

        img {
          width: 50px;
          height: 50px;
          vertical-align: middle;
        }
      }

      .loading-rates {
        display: none;
      }

      &.loading {
        padding: 10px;
        .loading-rates {
          display: block;
          position: absolute;
          top: -5px;
          left: -5px;
          width: 100%;
          height: 100%;
          border: solid 5px rgba(255, 255, 255, 0.3);
          border-top-color: rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: spin 3s linear infinite;
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

    .transfer-in {
      width: 40px;
      height: 40px;
      position: absolute;
      top: -40px;
      animation: transfer-in 3s forwards;
      padding: 0px;
      margin: 0px;
      z-index: 2;

      img {
        width: 40px;
        height: 40px;
      }
    }

    .transfer-out {
      width: 40px;
      height: 40px;
      position: absolute;
      top: 40px;
      animation: transfer-out 3s forwards;
      padding: 0px;
      margin: 0px;
      z-index: 2;

      img {
        width: 40px;
        height: 40px;
      }
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes transfer-in {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(80px);
      opacity: 0;
    }
  }

  @keyframes transfer-out {
    from {
      transform: translateY(0px) rotate(180deg);
      opacity: 1;
    }
    to {
      transform: translateY(-80px) rotate(180deg);
      opacity: 0;
    }
  }
</style>

<div class="box">
  {#if newTransferIn}
    <div class="transfer-in">
      <img src={`images/down-arrow.svg`} alt="down-arrow" />
    </div>
  {/if}
  {#if newTransferOut}
    <div class="transfer-out">
      <img src={`images/down-arrow.svg`} alt="down-arrow" />
    </div>
  {/if}
  <div class="icon" class:loading={loadingExchangeRates}>
    {#if loadingExchangeRates}
      <div class="loading-rates" />
    {/if}
    <a href={`/#/token/${token === "tez" ? "XTZ" : token[0]}`}>
      <img
        src={`images/${token === "tez" ? "XTZ" : token[0]}.png`}
        alt={token[0]}
      />
    </a>
  </div>
  {#if token !== "tez" && !$store.tokensExchangeRates[token[0]]}
    <div class="info">Loading...</div>
  {:else if token === "tez" && !$store.xtzData.exchangeRate}
    <div class="info">Loading...</div>
  {:else}
    <div class="info">
      <!-- if XTZ-->
      {#if token === "tez" && $store.xtzData.exchangeRate}
        <div>
          1 XTZ = {+$store.xtzData.exchangeRate.toFixed(5) / 1}
          {$localStorageStore.preferredFiat}
        </div>
        <div>
          1 {$localStorageStore.preferredFiat} = {+(
            $store.xtzData.exchangeRate / 10
          ).toFixed(5) / 1} XTZ
        </div>
      {:else if token === "tez" && !$store.xtzData.exchangeRate}
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
    {#if assetsType === "favorite" && token !== "tez" && $store.tokensBalances[token[0]]}
      <div class="info">
        <div>
          Balance: <span class:blurry-text={$store.blurryBalances}>
            {+$store.tokensBalances[token[0]].toFixed(5) / 1 || "> 0.00001"}
          </span>
        </div>
        {#if $store.tokensExchangeRates[token[0]]}
          <div>
            <span class:blurry-text={$store.blurryBalances}
              >{+(
                $store.tokensBalances[token[0]] *
                $store.tokensExchangeRates[token[0]].tokenToTez *
                $store.xtzData.exchangeRate
              ).toFixed(2) / 1}</span
            >
            {$localStorageStore.preferredFiat}
          </div>
        {:else}
          <div>N/A</div>
        {/if}
      </div>
    {:else if token === "tez" && $store.xtzData.balance}
      <div class="info">
        <div>
          Balance: <span class:blurry-text={$store.blurryBalances}>
            {+($store.xtzData.balance / 10 ** 6).toFixed(5) / 1}
          </span>
        </div>
        {#if $store.xtzData.exchangeRate}
          <div>
            <span class:blurry-text={$store.blurryBalances}>
              {+(
                ($store.xtzData.balance / 10 ** 6) *
                $store.xtzData.exchangeRate
              ).toFixed(5) / 1}
            </span>
            {$localStorageStore.preferredFiat}
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
      {#if token === "tez"}
        XTZ Price Trend
      {:else}
        {token[0]} -> XTZ Price Trend
      {/if}
    </div>
    <div slot="modal-body" class="modal-body">
      <canvas id="trendChart" width="400" height="300" />
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <button
        class="button main"
        on:click={() => {
          trendModalOpen = false;
        }}
      >
        Close
      </button>
    </div>
  </Modal>
{/if}
