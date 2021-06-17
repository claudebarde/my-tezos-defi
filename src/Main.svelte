<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "./store";
  import Assets from "./lib/Assets/Assets.svelte";
  import Investments from "./lib/Investments/Investments.svelte";
  import LastOperations from "./lib/LastOperations/LastOperations.svelte";
  import Charts from "./lib/Charts/Charts.svelte";

  let totalAmounts = { XTZ: undefined, FIAT: undefined };
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
        XTZ: valueInXTZ,
        FIAT: valueInXTZ * $store.xtzFiatExchangeRate
      };

      // calculates balances in USD
      if ($store.tokensBalances && $store.xtzFiatExchangeRate) {
        Object.entries($store.tokensBalances).forEach(
          ([tokenSymbol, balance]) => {
            if (balance && $store.tokensExchangeRates[tokenSymbol]) {
              balancesInUsd[tokenSymbol] =
                balance *
                $store.tokensExchangeRates[tokenSymbol].tokenToTez *
                $store.xtzFiatExchangeRate;
            }
          }
        );
      }

      updating = false;
    }
  });
</script>

<style lang="scss">
  @import "./styles/settings.scss";

  .stats {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px;
  }
</style>

{#if $store.userAddress}
  <div class="stats">
    <div>
      Owned tokens: {Object.values($store.tokensBalances).filter(tk => tk)
        .length}
    </div>
    <div>
      1 XTZ = {$store.xtzFiatExchangeRate
        ? $store.xtzFiatExchangeRate + " USD"
        : "N/A"}
    </div>
  </div>
  <div class="stats">
    <div>
      Total value:
      {#if totalAmounts.XTZ}
        {totalAmounts.XTZ.toFixed(2)} XTZ
      {:else}
        N/A
      {/if} - {#if totalAmounts.FIAT}
        {totalAmounts.FIAT.toFixed(2)} USD
      {:else}
        N/A
      {/if}
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
<LastOperations />
<br />
<br />
<Charts />
