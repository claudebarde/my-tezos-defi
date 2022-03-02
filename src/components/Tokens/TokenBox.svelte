<script lang="ts">
  import { afterUpdate } from "svelte";
  import Chart from "chart.js/auto";
  import { validateAddress } from "@taquito/utils";
  import type { AvailableToken } from "../../types";
  import { formatTokenAmount } from "../../utils";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import Modal from "../Modal/Modal.svelte";
  import config from "../../config";

  export let token: AvailableToken | "XTZ",
    tokensStatsWeekly:
      | {
          difference: number;
          increase: boolean;
        }
      | undefined, // undefined if XTZ
    tokensStatsDaily:
      | {
          difference: number;
          increase: boolean;
        }
      | undefined, // undefined if XTZ
    monthlyChartData: { timestamp: string; price: number }[] | undefined; // undefined if XTZ

  let chart;
  let openTransferModal = false;
  let tokenAmount = "";
  let tokenError = false;
  let transferRecipient = "";
  let transferRecipientError = false;
  let loadingTransfer = false;
  let mtdFee: null | number = null;

  const isTokenBtcWrapper = (token: string): boolean =>
    ["tzBTC", "BTCtz", "uBTC", "wWBTC"].includes(token);

  const generateChart = (chartData: { timestamp: string; price: number }[]) => {
    const data = {
      labels: [],
      datasets: [
        {
          label: "Price",
          data: [],
          fill: false,
          borderColor:
            chartData[0].price > chartData[chartData.length - 1].price
              ? "red"
              : "green",
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0
        }
      ]
    };

    chartData.forEach(d => {
      data.datasets[0].data.push(d.price);
      data.labels.push(d.timestamp.replace(/T.*Z/, ""));
    });
    const canvas = document.getElementById(
      `token-price-change-chart-${token}`
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
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              ticks: { display: false },
              grid: { display: false, drawBorder: false }
            },
            y: {
              ticks: { display: false },
              grid: { display: false, drawBorder: false }
            }
          }
        }
      });
    }
  };

  const transfer = async () => {
    if (
      tokenAmount &&
      !tokenError &&
      transferRecipient &&
      !transferRecipientError &&
      mtdFee
    ) {
      loadingTransfer = true;
      try {
        const { address, type, decimals } = $store.tokens[token];
        const contract = await $store.Tezos.wallet.at(address);
        const contractCall =
          type === "fa1.2"
            ? contract.methods.transfer(
                $store.userAddress,
                transferRecipient,
                +tokenAmount * 10 ** decimals
              )
            : contract.methods.transfer([
                {
                  from_: $store.userAddress,
                  txs: [
                    {
                      to_: transferRecipient,
                      token_id: $store.tokens[token].tokenId,
                      amount: +tokenAmount * 10 ** decimals
                    }
                  ]
                }
              ]);
        let batch = await $store.Tezos.wallet
          .batch()
          .withContractCall(contractCall);
        if ($store.serviceFee) {
          batch = batch.withTransfer({
            to: $store.admin,
            amount: Math.floor(mtdFee * 10 ** 6),
            mutez: true
          });
        }
        const batchOp = await batch.send();
        await batchOp.confirmation();
        tokenAmount = "";
        transferRecipient = "";
        mtdFee = null;
      } catch (error) {
        console.error(error);
      } finally {
        loadingTransfer = false;
      }
    }
  };

  afterUpdate(() => {
    if (
      token !== "XTZ" &&
      monthlyChartData &&
      monthlyChartData.length === 30 &&
      !chart
    ) {
      generateChart(monthlyChartData);
    } else if (
      token === "XTZ" &&
      $store.xtzData.historic &&
      $store.xtzData.historic.length > 0 &&
      !chart
    ) {
      generateChart($store.xtzData.historic);
      const dailyIncrease =
        $store.xtzData.historic[$store.xtzData.historic.length - 2].price <
        $store.xtzData.exchangeRate;
      const dailyDifference = (() => {
        const priceBefore =
          $store.xtzData.historic[$store.xtzData.historic.length - 2].price;
        const currentPrice = $store.xtzData.exchangeRate;
        const difference =
          (priceBefore - currentPrice) / ((priceBefore + currentPrice) / 2);
        return Math.abs(difference * 100);
      })();
      const monthlyIncrease =
        $store.xtzData.historic[$store.xtzData.historic.length - 30].price <
        $store.xtzData.exchangeRate;
      const monthlyDifference = (() => {
        const priceBefore =
          $store.xtzData.historic[$store.xtzData.historic.length - 30].price;
        const currentPrice = $store.xtzData.exchangeRate;
        const difference =
          (priceBefore - currentPrice) / ((priceBefore + currentPrice) / 2);
        return Math.abs(difference * 100);
      })();
      tokensStatsDaily = {
        increase: dailyIncrease,
        difference: dailyDifference
      };
      tokensStatsWeekly = {
        increase: monthlyIncrease,
        difference: monthlyDifference
      };
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .favorite-token {
    display: grid;
    row-gap: 10px;
    width: 250px;
    border: solid 1px $bg-color;
    border-radius: 10px;
    padding: 1rem 10px;
    position: relative;
    z-index: 10;

    img {
      height: 2.4rem;
      position: absolute;
      top: -1.4rem;
      left: 10px;
      background-color: white;
      padding: 0px 3px;
    }

    .favorite-token__price {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .favorite-token__stats {
      border-top: solid 1px $bg-color;
      padding: 10px 10px 0px 10px;
      font-size: 0.8rem;
    }
  }
</style>

{#if token === "XTZ"}
  <div class="favorite-token">
    <img src="images/XTZ.png" alt="XTZ-logo" />
    <div>XTZ</div>
    <div>
      <div>{formatTokenAmount($store.xtzData.balance / 10 ** 6)}</div>
      <div>
        {+(
          ($store.xtzData.balance / 10 ** 6) *
          $store.xtzData.exchangeRate
        ).toFixed(2) / 1}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
    <div class="favorite-token__stats">
      {#if tokensStatsDaily}
        <div>
          Price change (24 h):
          <span style={`color:${tokensStatsDaily.increase ? "green" : "red"}`}>
            {tokensStatsDaily.increase
              ? "+"
              : "-"}{tokensStatsDaily.difference.toFixed(2)}%
          </span>
        </div>
      {/if}
      {#if tokensStatsWeekly}
        <div>
          Price change (7 d):
          <span style={`color:${tokensStatsWeekly.increase ? "green" : "red"}`}>
            {tokensStatsWeekly.increase
              ? "+"
              : "-"}{tokensStatsWeekly.difference.toFixed(2)}%
          </span>
        </div>
      {/if}
    </div>
    {#if $store.xtzData.historic}
      <div class="token-price-change-container">
        <canvas
          id={`token-price-change-chart-${token}`}
          width="250"
          height="70"
        />
      </div>
    {/if}
    <div>
      <span style="font-size:0.5rem;text-align:center">
        Price changes over the last 30 days
      </span>
    </div>
    <div />
    <div />
  </div>
{:else}
  <div class="favorite-token">
    <img src={`images/${token}.png`} alt={`${token}-logo`} />
    <div class="favorite-token__price">
      <div>
        <div>{token}</div>
        <div style="font-size:0.8rem">
          {formatTokenAmount($store.tokens[token].exchangeRate)} ꜩ
        </div>
        {#if $store.tokensBalances && $store.tokensBalances.hasOwnProperty(token) && $store.tokensBalances[token] > 0}
          <button
            class="mini"
            style="margin-top:10px"
            on:click={() => (openTransferModal = true)}
          >
            Send &nbsp;
            <span class="material-icons"> send_to_mobile </span>
          </button>
        {:else}
          <div>&nbsp;</div>
        {/if}
      </div>
      <div>
        {#if $store.tokensBalances && !isNaN($store.tokensBalances[token]) && $store.xtzData.exchangeRate}
          <div>
            {#if formatTokenAmount($store.tokensBalances[token]) === 0 && !isTokenBtcWrapper(token)}
              No balance
            {:else if !isTokenBtcWrapper(token)}
              {formatTokenAmount($store.tokensBalances[token])}
            {:else if isTokenBtcWrapper(token)}
              {formatTokenAmount($store.tokensBalances[token], 8)}
            {/if}
          </div>
          {#if $store.tokensBalances && formatTokenAmount($store.tokensBalances[token]) === 0 && !isTokenBtcWrapper(token)}
            <div />
            <div />
            <div />
          {:else}
            <div>
              {+(
                $store.tokensBalances[token] * $store.tokens[token].exchangeRate
              ).toFixed(3) / 1} ꜩ
            </div>
            {#if $localStorageStore}
              <div>
                {+(
                  $store.tokensBalances[token] *
                  $store.tokens[token].exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2) / 1}
                {$localStorageStore.preferredFiat}
              </div>
            {:else}
              <div>
                {+(
                  $store.tokensBalances[token] *
                  $store.tokens[token].exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2) / 1} USD
              </div>
            {/if}
          {/if}
        {:else}
          <div>---</div>
          <div>---</div>
        {/if}
      </div>
    </div>
    {#if tokensStatsWeekly || tokensStatsDaily}
      <div class="favorite-token__stats">
        {#if tokensStatsDaily}
          <div>
            Price change (24 h):
            <span
              style={`color:${tokensStatsDaily.increase ? "green" : "red"}`}
            >
              {tokensStatsDaily.increase
                ? "+"
                : "-"}{tokensStatsDaily.difference.toFixed(2)}%
            </span>
          </div>
        {/if}
        {#if tokensStatsWeekly}
          <div>
            Price change (7 d):
            <span
              style={`color:${tokensStatsWeekly.increase ? "green" : "red"}`}
            >
              {tokensStatsWeekly.increase
                ? "+"
                : "-"}{tokensStatsWeekly.difference.toFixed(2)}%
            </span>
          </div>
        {/if}
      </div>
    {/if}
    {#if monthlyChartData}
      <div class="token-price-change-container">
        <canvas
          id={`token-price-change-chart-${token}`}
          width="250"
          height="70"
        />
      </div>
      <span style="font-size:0.5rem;text-align:center">
        Price changes over the last 30 days
      </span>
    {:else}
      <div style="font-size:0.8rem;text-align:center">No data available</div>
    {/if}
  </div>
{/if}
{#if openTransferModal}
  <Modal type="default" on:close={() => (openTransferModal = false)}>
    <div slot="modal-title" class="modal-title">Send {token}</div>
    <div slot="modal-body" class="modal-body">
      <div class="modal-line">Enter the recipient's address</div>
      <div class="modal-body__transfer__input">
        <div>
          <span class="material-icons" style="font-size:40px">
            account_circle
          </span>
        </div>
        <input
          type="text"
          bind:value={transferRecipient}
          style={transferRecipientError ? `color:red` : ""}
          readonly={loadingTransfer}
          on:input={ev => {
            const val = ev.target.value;
            if (validateAddress(val) !== 3) {
              transferRecipient = "";
            }
          }}
        />
      </div>
      <div class="modal-line">Enter the amount to send</div>
      <div class="modal-body__transfer__input">
        <img
          src={`images/${token}.png`}
          alt="token-icon"
          class:loading={loadingTransfer}
        />
        <div>
          <input
            type="text"
            bind:value={tokenAmount}
            style={tokenError ? `color:red` : ""}
            readonly={loadingTransfer}
            on:input={ev => {
              tokenError = false;
              mtdFee = null;
              const val = ev.target.value;
              if (isNaN(+val)) {
                tokenAmount = "";
              } else {
                tokenAmount = val;
                mtdFee =
                  +val * $store.tokens[token].exchangeRate * $store.serviceFee;
                if (+val > $store.tokensBalances[token]) {
                  tokenError = true;
                }
              }
            }}
          />
          <button
            class="modal-body__transfer__available-balance"
            on:click={() => {
              tokenAmount = $store.tokensBalances[token];
              mtdFee =
                +tokenAmount *
                $store.tokens[token].exchangeRate *
                $store.serviceFee;
            }}
          >
            Max: {formatTokenAmount($store.tokensBalances[token])}
            {token}
          </button>
        </div>
      </div>
      {#if mtdFee}
        <div class="modal-line" style="font-size:0.7rem">
          MTD fee: {formatTokenAmount(mtdFee)} XTZ
        </div>
      {:else}
        <div class="modal-line">&nbsp;</div>
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      {#if tokenAmount && transferRecipient && !tokenError && !loadingTransfer}
        <button class="primary" on:click={transfer}> Send </button>
      {:else if tokenAmount && transferRecipient && !tokenError && loadingTransfer}
        <button class="primary loading" disabled>
          Sending &nbsp;
          <span class="material-icons"> sync </span>
        </button>
      {:else}
        <div />
      {/if}
      <button class="primary" on:click={() => (openTransferModal = false)}>
        Close
      </button>
    </div>
  </Modal>
{/if}
