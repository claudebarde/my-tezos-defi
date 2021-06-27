<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import store from "../../store";

  export let tokenSymbol, value;

  const dispatch = createEventDispatcher();
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .calculator-token {
    display: grid;
    grid-template-columns: 20% 70%;
    justify-items: center;
    align-items: center;
    padding: 10px;

    img {
      width: 40px;
      height: 40px;
    }

    input {
      border-bottom: solid 1px #d1d5db;
      border-radius: 0px;
      margin: 5px;
      color: black;
      font-size: 1.1rem;

      &:focus {
        border-bottom: solid 1px $bg-color;
      }
    }

    .exchange-rates {
      font-size: 0.9rem;
      padding: 0px 10px;
    }
  }
</style>

{#if $store.tokensExchangeRates[tokenSymbol] || tokenSymbol === "XTZ"}
  <div class="calculator-token">
    <div>
      <img src={`images/${tokenSymbol}.png`} alt={tokenSymbol} />
    </div>
    <div>
      <input
        type="text"
        value={value || ""}
        placeholder="0"
        on:input={e =>
          dispatch("update", { val: e.target.value, token: tokenSymbol })}
      />
      <div class="exchange-rates">
        {#if tokenSymbol === "XTZ" && $store.xtzData.exchangeRate}
          <div>
            1 USD = {+($store.xtzData.exchangeRate / 10).toFixed(5) / 1} XTZ
          </div>
          <div>
            1 XTZ = {+$store.xtzData.exchangeRate.toFixed(5) / 1} USD
          </div>
        {:else if tokenSymbol !== "XTZ"}
          <div>
            1 {tokenSymbol} = {+$store.tokensExchangeRates[
              tokenSymbol
            ].realPriceInTez.toFixed(5) / 1}
            XTZ
          </div>
          <div>
            1 XTZ = {+$store.tokensExchangeRates[
              tokenSymbol
            ].realPriceInToken.toFixed(5) / 1}
            {tokenSymbol}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
