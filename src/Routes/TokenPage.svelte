<script lang="ts">
  import { onMount } from "svelte";
  import store from "../store";
  import LastOperations from "../lib/LastOperations/LastOperations.svelte";
  import type { AvailableToken } from "../types";

  export let params;

  let unsupportedToken = false;
  let tokenSymbol: AvailableToken;

  onMount(() => {
    const { tokenSymbol: pTokenSymbol } = params;

    if (Object.keys($store.tokens).includes(pTokenSymbol)) {
      unsupportedToken = false;
      tokenSymbol = pTokenSymbol;
    } else {
      unsupportedToken = true;
    }
  });
</script>

<style lang="scss">
  .material-icons {
    vertical-align: bottom;
  }

  a {
    text-decoration: none;
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  .container-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .icon {
      img {
        width: 64px;
        height: 64px;
      }
    }

    .prices {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: flex-start;
      gap: 40px;
      text-align: center;
    }
  }
</style>

<br />
<br />
{#if unsupportedToken}
  <div>Unsupported or unknown token</div>
{:else if !unsupportedToken && tokenSymbol}
  <div>
    <a href="/#/">
      <span class="material-icons"> arrow_back </span> Back
    </a>
  </div>
  <br /><br />
  <div class="container">
    <div class="title">General</div>
    <div class="container-body">
      <div class="icon">
        <img src={`images/${tokenSymbol}.png`} alt={tokenSymbol} />
      </div>
      <div>
        {tokenSymbol} Token
      </div>
      <br />
      <div>
        <a
          href={`https://better-call.dev/mainnet/${
            $store.tokens[tokenSymbol].address[$store.network]
          }/operations`}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          <span class="material-icons"> receipt_long </span> Token contract
        </a>
      </div>
      <br />
      {#if $store.tokensExchangeRates[tokenSymbol]}
        <div class="prices">
          <div>
            <div>QuipuSwap Exchange Rate</div>
            <div>
              1 XTZ = {+$store.tokensExchangeRates[
                tokenSymbol
              ].tezToToken.toFixed(5) / 1}
              {tokenSymbol}
            </div>
            <div>
              1 {tokenSymbol} = {+$store.tokensExchangeRates[
                tokenSymbol
              ].tokenToTez.toFixed(5) / 1}
              XTZ
            </div>
          </div>
          <div>
            <div>Real Price</div>
            <div>
              1 XTZ = {+$store.tokensExchangeRates[
                tokenSymbol
              ].realPriceInToken.toFixed(5) / 1}
              {tokenSymbol}
            </div>
            <div>
              1 {tokenSymbol} = {+$store.tokensExchangeRates[
                tokenSymbol
              ].realPriceInTez.toFixed(5) / 1}
              XTZ
            </div>
          </div>
        </div>
      {:else}
        <div>No data</div>
      {/if}
      {#if $store.tokensBalances[tokenSymbol]}
        <br />
        <div>
          Balance: {+$store.tokensBalances[tokenSymbol].toFixed(5) / 1}
          {tokenSymbol}
        </div>
        {#if $store.tokensExchangeRates[tokenSymbol]}
          <br />
          <div>
            Total in XTZ: {+(
              +$store.tokensBalances[tokenSymbol] *
              $store.tokensExchangeRates[tokenSymbol].tokenToTez
            ).toFixed(2) / 1} XTZ
          </div>
          <div>
            Total in USD: {+(
              +$store.tokensBalances[tokenSymbol] *
              $store.tokensExchangeRates[tokenSymbol].tokenToTez *
              $store.xtzFiatExchangeRate
            ).toFixed(2) / 1} USD
          </div>
        {:else}
          <div>N/A</div>
        {/if}
      {/if}
    </div>
  </div>
  <br />
  <br />
  <LastOperations
    lastOps={$store.lastOperations}
    filterOps={{ opType: "token", token: tokenSymbol }}
  />
{/if}
