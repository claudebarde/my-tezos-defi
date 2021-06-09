<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "./store";
  import type { TokenContract } from "./types";

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
            if (balance) {
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

  .container {
    border: solid 4px #4b5563;
    border-radius: 20px;
    width: 80%;
    margin: 0 auto;
    background-color: #1e3a8a;
    position: relative;

    .title {
      $title-height: 15px;

      height: $title-height;
      font-size: $title-height;
      background-color: #4b5563;
      position: absolute;
      left: $title-height;
      top: calc(calc(#{$title-height} * -1) - 5px);
      padding: 5px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 5px;
    }

    .row {
      display: grid;
      grid-template-columns: 20% 40% 40%;
      align-items: center;
      padding: 10px 20px;

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
    }
  }

  @media only screen and (max-width: $mobile-break-point) {
    .container {
      .row {
        display: flex;
        flex-direction: column;

        .info {
          margin: 10px 0px;
        }
      }
    }
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
<div class="container">
  <div class="title">Assets</div>
  {#each Object.entries($store.tokens) as token}
    <div class="row">
      <div class="icon">
        <img src={`images/${token[0]}.png`} alt={token[0]} />
      </div>
      <div class="info">
        {#if $store.tokensExchangeRates[token[0]]}
          <div>
            1 XTZ = {$store.tokensExchangeRates[token[0]].tezToToken}
            {token[0]}
          </div>
          <div>
            1 {token[0]} = {$store.tokensExchangeRates[token[0]].tokenToTez} XTZ
          </div>
        {:else}
          <div>No data</div>
        {/if}
      </div>
      {#if $store.userAddress}
        <div class="info">
          {#if $store.tokensBalances[token[0]]}
            <div>
              Balance: {+$store.tokensBalances[token[0]].toFixed(3) / 1}
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
          {:else}
            <div>No balance</div>
          {/if}
        </div>
      {:else}
        <div class="info" />
      {/if}
    </div>
  {/each}
</div>
