<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../store";
  import localStorageStore from "../localStorage";
  import Assets from "../lib/Assets/Assets.svelte";
  import Investments from "../lib/Investments/Investments.svelte";
  import LastOperations from "../lib/LastOperations/LastOperations.svelte";
  import Charts from "../lib/Charts/Charts.svelte";
  import Settings from "../lib/Tools/Settings.svelte";
  import Calculator from "../lib/Tools/Calculator.svelte";
  import { calcTotalShareValueInTez } from "../utils";

  let totalAmounts = { XTZ: undefined, TOKENS: undefined, FIAT: undefined };
  let totalInvestments = { XTZ: undefined, FIAT: undefined };
  let balancesInUsd = {
    kUSD: undefined,
    hDAO: undefined,
    PLENTY: undefined,
    wXTZ: undefined,
    STKR: undefined,
    tzBTC: undefined,
    USDtz: undefined,
    ETHtz: undefined
  };
  let updating = false;

  afterUpdate(async () => {
    if (!updating) {
      updating = true;

      // calculates total in XTZ and USD
      const valueInXTZ = Object.entries($store.tokensBalances)
        .map(token => {
          const [tokenSymbol, tokenVal] = token;
          if (!tokenVal) return 0;

          const exchangeRate = $store.tokensExchangeRates[tokenSymbol];
          if (exchangeRate) {
            return +tokenVal * +exchangeRate.tokenToTez;
          } else {
            return 0;
          }
        })
        .reduce((a, b) => a + b);

      totalAmounts = {
        TOKENS: valueInXTZ,
        XTZ: valueInXTZ + $store.xtzData.balance / 10 ** 6,
        FIAT:
          (valueInXTZ + $store.xtzData.balance / 10 ** 6) *
          $store.xtzData.exchangeRate
      };

      // calculates balances in USD
      if ($store.tokensBalances && $store.xtzData.exchangeRate) {
        Object.entries($store.tokensBalances).forEach(
          ([tokenSymbol, balance]) => {
            if (balance && $store.tokensExchangeRates[tokenSymbol]) {
              balancesInUsd[tokenSymbol] =
                balance *
                $store.tokensExchangeRates[tokenSymbol].tokenToTez *
                $store.xtzData.exchangeRate;
            }
          }
        );
      }

      // calculates total investments
      if ($store.xtzData.exchangeRate) {
        let tempTotalInvestments = 0;
        Object.entries($store.investments).forEach(([contractName, data]) => {
          if ($store.tokensExchangeRates[data.token] === undefined) return;

          if (
            [
              "Plenty hDAO staking",
              "Plenty staking",
              "Plenty USDtz staking"
            ].includes(data.alias) &&
            $store.tokensExchangeRates[data.token]
          ) {
            tempTotalInvestments +=
              (data.balance / 10 ** data.decimals) *
              $store.tokensExchangeRates[data.token].tokenToTez;
          } else if (
            data.alias === "PLENTY-XTZ LP farm" &&
            $store.tokensExchangeRates.PLENTY
          ) {
            tempTotalInvestments += calcTotalShareValueInTez(
              data.balance,
              data.shareValueInTez,
              $store.tokensExchangeRates.PLENTY.tokenToTez,
              $store.tokens.PLENTY.decimals
            );
          } else if (contractName === "CRUNCHY-FARMS") {
            data.info.forEach(farm => {
              tempTotalInvestments += calcTotalShareValueInTez(
                farm.amount,
                farm.shareValueInTez,
                $store.tokensExchangeRates.CRUNCH.tokenToTez,
                $store.tokens.CRUNCH.decimals
              );
            });
          }
        });
        totalInvestments = {
          XTZ: tempTotalInvestments,
          FIAT: tempTotalInvestments * $store.xtzData.exchangeRate
        };
      }

      updating = false;
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 50px;

    & > div {
      padding: 5px 0px;
    }

    .options {
      a {
        text-decoration: none;
        color: inherit;
      }
    }
  }

  @media only screen and (max-width: $mobile-break-point) {
    .stats {
      flex-direction: column-reverse;
      text-align: center;
    }
  }
</style>

{#if $store.userAddress}
  <div class="stats">
    <div>
      <!-- TOKENS + XTZ -->
      Tokens value:
      {#if totalAmounts.XTZ}
        {totalAmounts.XTZ.toFixed(2)} XTZ
      {:else}
        N/A
      {/if} - {#if totalAmounts.FIAT}
        {totalAmounts.FIAT.toFixed(2)} {$localStorageStore.preferredFiat}
      {:else}
        N/A
      {/if}
    </div>
    <div class="options">
      <a href="#/profile">
        <span class="material-icons"> account_circle </span>
      </a>
      <Calculator />
      <Settings />
    </div>
  </div>
  <div class="stats">
    <div>
      {#if totalInvestments.XTZ && totalInvestments.FIAT}
        Investments: {+totalInvestments.XTZ.toFixed(2) / 1} XTZ - {+totalInvestments.FIAT.toFixed(
          2
        ) / 1}
        {$localStorageStore.preferredFiat}
      {/if}
    </div>
    <div />
  </div>
  <div class="stats">
    <div>
      {#if totalInvestments.XTZ && totalInvestments.FIAT && totalAmounts.XTZ && totalAmounts.FIAT}
        Total: {+(totalInvestments.XTZ + totalAmounts.XTZ).toFixed(2) / 1} XTZ -
        {+(totalInvestments.FIAT + totalAmounts.FIAT).toFixed(2) / 1}
        {$localStorageStore.preferredFiat}
      {/if}
    </div>
  </div>
  <br />
{:else}
  <div class="stats">
    <div />
    <div class="options">
      <Calculator />
      <Settings />
    </div>
  </div>
  <br />
{/if}
{#if $store.userAddress && Object.values($store.tokensBalances).some(el => el)}
  <Assets {balancesInUsd} assetsType="owned" />
  <br />
  <br />
{/if}
<Assets {balancesInUsd} assetsType="general" />
<br />
<br />
{#if $store.userAddress}
  <Investments />
  <br />
  <br />
{/if}
<LastOperations
  lastOps={$store.lastOperations}
  filterOps={{ opType: "general" }}
/>
<br />
<br />
<Charts />
