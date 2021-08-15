<script lang="ts">
  import { afterUpdate } from "svelte";
  import Modal from "../Modal/Modal.svelte";
  import store from "../../store";
  import { AvailableFiat } from "../../types";
  import localStorageStore from "../../localStorage";
  import FeeDisclaimer from "../Modal/FeeDisclaimer.svelte";
  import config from "../../config";

  let openSettings = false;
  let newRpcNode = "";
  let newFiat: AvailableFiat;

  afterUpdate(() => {
    if (!openSettings) {
      newFiat = undefined;
      newRpcNode = "";
    }
  });
</script>

<style lang="scss">
  .settings {
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto;
    align-items: center;
    gap: 30px 10px;

    #currencies-datalist {
      width: 100px;
    }
  }
</style>

<!--
-->
<span
  class="material-icons"
  style="cursor:pointer"
  on:click={() => (openSettings = true)}
>
  settings
</span>
{#if openSettings}
  <Modal type="manage" on:close={() => (openSettings = false)}>
    <div slot="modal-title" class="modal-title">Settings</div>
    <div slot="modal-body" class="modal-body">
      <div class="settings">
        <div>Change currency</div>
        <div>
          <input
            type="text"
            list="currencies"
            id="currencies-datalist"
            bind:value={newFiat}
            placeholder={$localStorageStore.preferredFiat}
          />
          <button
            class="button mini"
            on:click={async () => {
              if (
                newFiat !== $localStorageStore.preferredFiat &&
                Object.keys(AvailableFiat).includes(newFiat)
              ) {
                localStorageStore.updateFiat(newFiat, 0);

                const coinGeckoResponse = await fetch(
                  `https://api.coingecko.com/api/v3/coins/tezos/market_chart?vs_currency=${newFiat}&days=2`
                );
                if (coinGeckoResponse) {
                  const data = await coinGeckoResponse.json();
                  const prices = data.prices;
                  const xtzFiatExchangeRate = prices[prices.length - 1][1];
                  store.updateXtzFiatExchangeRate(xtzFiatExchangeRate);
                  store.updateXtzDataHistoric(
                    prices.map(price => ({
                      timestamp: price[0],
                      rate: price[1]
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
                openSettings = false;
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
        </div>
        <div>Allow contribution</div>
        <FeeDisclaimer />
        <div>Change RPC node</div>
        <div>
          <input
            type="text"
            list="rpc-nodes"
            placeholder={$localStorageStore.favoriteRpcUrl}
            bind:value={newRpcNode}
          />
          <button
            class="button mini"
            on:click={() => {
              $store.Tezos.setRpcProvider(newRpcNode);
              store.updateTezos($store.Tezos);
              localStorageStore.updateFavoriteRpcUrl(newRpcNode);
              openSettings = false;
            }}
          >
            Change
          </button>
          <datalist id="rpc-nodes">
            {#each $store.settings[$store.network].validRpcUrls as item}
              <option value={item.url}>{item.name}</option>
            {/each}
          </datalist>
        </div>
        {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
          <div>Allow Push Notifications</div>
          <div>
            <div>
              Push notifications will only be sent when the app is open and when
              you receive/send a transaction
            </div>
            <div>
              {#if $localStorageStore.pushNotifications}
                <button class="button mini" style="float:right">Disable</button>
              {:else}
                <button class="button mini" style="float:right">Allow</button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button
          class="button secondary"
          on:click={() => {
            openSettings = false;
          }}
        >
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
