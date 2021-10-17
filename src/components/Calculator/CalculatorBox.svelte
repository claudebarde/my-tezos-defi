<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import config from "../../config";
  import { AvailableToken } from "../../types";

  export let tokenSymbol, value;

  const dispatch = createEventDispatcher();
  let validFiats = [];

  onMount(() => {
    validFiats = config.validFiats.map(fiat => fiat.code);
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .calculator-token {
    display: grid;
    grid-template-columns: 30% 70%;
    justify-items: center;
    align-items: center;
    column-gap: 10px;
    padding: 10px;
    overflow-x: hidden;

    img {
      width: 40px;
      height: 40px;
      padding: 10px;
    }

    span.fiat-symbol {
      border: solid 2px black;
      border-radius: 50%;
      padding: 5px 15px;
      font-size: 1.5rem;

      &.CAD,
      &.SGP {
        padding: 12px 10px;
        font-size: 1rem;
      }
    }

    input[type="text"] {
      font-size: 1.1rem;
      border: none;
      border-bottom: solid 2px #d1d5db;
      outline: none;
      padding: 3px;
      margin-bottom: 3px;

      &:focus {
        border-bottom: solid 2px $bg-color;
      }
    }

    .exchange-rates {
      font-size: 0.9rem;
      padding: 0px 10px;
    }
  }
</style>

{#if $store.tokens[tokenSymbol] || tokenSymbol === "XTZ" || validFiats.includes(tokenSymbol)}
  <div class="calculator-token">
    <div>
      {#if validFiats.includes(tokenSymbol)}
        <span class={`fiat-symbol ${tokenSymbol}`}>
          {config.validFiats.find(fiat => fiat.code === tokenSymbol).symbol}
        </span>
      {:else}
        <img src={`images/${tokenSymbol}.png`} alt={tokenSymbol} />
      {/if}
    </div>
    <div>
      <input
        type="text"
        value={value || ""}
        placeholder="0"
        on:input={e =>
          dispatch("update", {
            val: e.target.value,
            token:
              Object.values(AvailableToken).includes(tokenSymbol) ||
              tokenSymbol === "XTZ"
                ? tokenSymbol
                : "FIAT"
          })}
      />
      <div class="exchange-rates">
        {#if (tokenSymbol === "XTZ" || config.validFiats
            .map(fiat => fiat.code)
            .includes(tokenSymbol)) && $store.xtzData.exchangeRate}
          <div>
            1 {$localStorageStore.preferredFiat} = {+(
              1 / $store.xtzData.exchangeRate
            ).toFixed(5) / 1} XTZ
          </div>
          <div>
            1 XTZ = {+$store.xtzData.exchangeRate.toFixed(5) / 1}
            {$localStorageStore.preferredFiat}
          </div>
        {:else if tokenSymbol !== "XTZ"}
          <div>
            1 {tokenSymbol} = {+$store.tokens[tokenSymbol].exchangeRate.toFixed(
              5
            ) / 1}
            XTZ
          </div>
          <div>
            1 XTZ = {+(1 / $store.tokens[tokenSymbol].exchangeRate).toFixed(5) /
              1}
            {tokenSymbol}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
