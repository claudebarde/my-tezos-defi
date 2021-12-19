<script lang="ts">
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { AvailableFiat } from "../../types";
  import config from "../../config";
  import FeeDisclaimer from "./FeeDisclaimer.svelte";

  let newRpcNode = "";
  let newFiat: AvailableFiat;
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    .settings {
      display: grid;
      grid-template-columns: 30% 50% 20%;
      grid-template-rows: auto;
      justify-items: start;
      align-items: center;
      gap: 50px 20px;
      width: calc(100% - 40px);

      #currencies-datalist {
        width: 100px;
      }

      input[type="text"] {
        margin: 0px 8px;
        padding: 5px 8px;
        border-radius: 10px;
        border: none;
        outline: none;
        color: $container-bg-color;
        background-color: lighten($container-bg-color, 60);
        font-size: 1rem;
      }
    }
  }
</style>

<section>
  <div class="settings">
    <div>Change currency</div>
    <input
      type="text"
      list="currencies"
      id="currencies-datalist"
      bind:value={newFiat}
      placeholder={$localStorageStore.preferredFiat}
    />
    <button
      class="mini"
      style="place-self: center stretch"
      on:click={async () => {
        if (
          newFiat !== $localStorageStore.preferredFiat &&
          Object.keys(AvailableFiat).includes(newFiat)
        ) {
          localStorageStore.updateFiat(newFiat, 0);

          const coinGeckoResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/tezos/market_chart?vs_currency=${newFiat}&days=30&interval=daily`
          );
          if (coinGeckoResponse) {
            const data = await coinGeckoResponse.json();
            const prices = data.prices;
            const xtzFiatExchangeRate = prices[prices.length - 1][1];
            store.updateXtzFiatExchangeRate(xtzFiatExchangeRate);
            store.updateXtzDataHistoric(
              prices.map(price => ({
                timestamp: new Date(price[0]).toISOString(),
                price: price[1]
              }))
            );
            if ($localStorageStore && $store.userAddress) {
              // saves the exchange rate in the local store
              localStorageStore.updateFiat(
                $localStorageStore.preferredFiat,
                xtzFiatExchangeRate
              );
            }
          } else {
            throw "No response from CoinGecko API";
          }
        } else {
          newFiat = undefined;
        }
      }}
    >
      Change
    </button>
    <datalist id="currencies">
      {#each config.validFiats as fiat}
        <option value={fiat.code}>{fiat.name}</option>
      {/each}
    </datalist>
    <div>Blur balances</div>
    <div>Hide your different balances and investments throughout the app</div>
    <button
      class="mini"
      style="place-self: center stretch"
      on:click={() => store.updateBlurryBalances(!$store.blurryBalances)}
    >
      {#if $store.blurryBalances}
        Make visible
      {:else}
        Blur balances
      {/if}
    </button>
    <div>Allow contribution</div>
    <FeeDisclaimer />
    <div />
    <div>Change RPC node</div>
    <div>
      <input
        type="text"
        list="rpc-nodes"
        placeholder={$store.Tezos.rpc.getRpcUrl()}
        bind:value={newRpcNode}
      />
      <datalist id="rpc-nodes">
        {#each $store.settings[$store.network].validRpcUrls as item}
          <option value={item.url}>{item.name}</option>
        {/each}
      </datalist>
    </div>
    <button
      class="mini"
      style="place-self: center stretch"
      on:click={() => {
        $store.Tezos.setRpcProvider(newRpcNode);
        store.updateTezos($store.Tezos);
        localStorageStore.updateFavoriteRpcUrl(newRpcNode);
      }}
    >
      Change
    </button>
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <div>Allow Push Notifications</div>
      <div>
        Push notifications will only be sent when the app is open and when you
        receive/send a transaction
      </div>
      {#if $localStorageStore.pushNotifications}
        <button class="mini" style="place-self: center stretch">Disable</button>
      {:else}
        <button class="mini" style="place-self: center stretch">Allow</button>
      {/if}
    {/if}
  </div>
</section>
