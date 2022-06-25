<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { Option } from "@swan-io/boxed";
  import store from "../store";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import config from "../config";
  import { LocalStorage } from "../localStorage";
  import type { AvailableFiat } from "../types";
  import { coinGeckoFetch } from "../utils";
  import type { FiatData } from "../localStorage";

  let allowPushNotifications = Option.None<boolean>();
  let currentFiat = Option.None<FiatData>();

  const updateRpcUrl = event => {
    const url = event.target.value;
    if (config.availableRpcUrls.includes(url)) {
      $store.localStorage.setRpcUrl(url);
      $store.Tezos.setRpcProvider(url);
    }
  };

  const updateFavoriteFiat = async event => {
    const newFavoriteFiat: AvailableFiat = event.target.value;
    const fiatInfo = config.validFiats.find(
      fiat => fiat.code === newFavoriteFiat
    );
    if (fiatInfo) {
      $store.localStorage.setFavoriteFiat(fiatInfo);
      currentFiat = Option.Some(fiatInfo);
      // fetches exchange rate for new currency
      const { exchangeRate, priceHistoric } = await coinGeckoFetch(
        fiatInfo.code
      );
      store.updateXtzExchangeRate(exchangeRate);
      store.updatePriceHistoric(priceHistoric);
    }
  };

  onMount(() => {
    // checks for push notification permission
    if ("Notification" in window) {
      allowPushNotifications = Option.Some(
        Notification.permission === "granted" ? true : false
      );
    } else {
      console.warn("Notifications are not available in this browser");
    }
  });

  afterUpdate(() => {
    if ($store.localStorage && currentFiat.isNone()) {
      const fiat = config.validFiats.find(
        fiat => fiat.code === $store.localStorage.getFavoriteFiat().code
      );
      if (fiat) {
        currentFiat = Option.Some(fiat);
      } else {
        currentFiat = Option.None();
      }
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .settings {
    text-align: center;
    width: 60%;
    margin: 0 auto;

    & > div {
      margin-bottom: 25px;
      padding-bottom: 25px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 10px;

      &:not(:last-child) {
        border-bottom: dashed 1px $midnight-blue;
      }
    }

    h4 {
      padding: 0px;
      margin: 0px;
      font-size: 1.1rem;
    }

    select {
      border: none;
      padding: 10px;
      font-size: 0.9rem;
      color: inherit;
      outline: none;
      cursor: pointer;
      background-color: $blizzard-blue;
      border-radius: $std-border-radius;
    }
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader />
  {/if}
  <div class="settings">
    <div>
      <h4>Change RPC URL</h4>
      <p>
        <select on:change={updateRpcUrl}>
          {#each config.availableRpcUrls as url}
            <option value={url} selected={url === LocalStorage.getRpcUrl()}>
              {url}
            </option>
          {/each}
        </select>
      </p>
    </div>
    {#if allowPushNotifications.isSome()}
      <div>
        <h4>Push notifications</h4>
        <p>
          Instead of in-app notifications that you can only see when the dapp is
          open in the current tab, you can get push notifications while using
          other apps on your computer
        </p>
        <p>
          {#if allowPushNotifications.getWithDefault(null)}
            <span class="material-icons-outlined"> check_circle </span> Notifications
            have been allowed
          {:else}
            <button
              class="primary"
              on:click={async () => {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                  allowPushNotifications = Option.Some(true);
                } else {
                  allowPushNotifications = Option.Some(false);
                }
              }}
            >
              Allow
            </button>
          {/if}
        </p>
      </div>
    {/if}
    {#if $store.localStorage}
      <div>
        <h4>Choose your favorite currency</h4>
        <p>
          Currently: {currentFiat.match({
            None: () => "no selected curency",
            Some: val => val.name
          })}
        </p>
        <select on:change={updateFavoriteFiat}>
          {#each config.validFiats as fiat}
            <option
              value={fiat.code}
              selected={fiat.code ===
                $store.localStorage.getFavoriteFiat().code}
            >
              {fiat.name}
            </option>
          {/each}
        </select>
      </div>
    {/if}
    <div>
      <h4>Blur balances</h4>
      <p>
        {$store.blurryBalances ? "Reveal" : "Hide"} the amounts of your balances
        in the dapp
      </p>
      <p>
        <input
          type="checkbox"
          checked={$store.blurryBalances}
          on:change={() => store.updateBlurryBalances()}
        />
        <span>
          {$store.blurryBalances
            ? "Balances are hidden"
            : "Balances are visible"}
        </span>
      </p>
    </div>
  </div>
</div>
