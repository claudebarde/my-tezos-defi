<script lang="ts">
  import { afterUpdate } from "svelte";
  import { location } from "svelte-spa-router";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import FavoriteTokenDisplay from "./FavoriteTokensDisplay.svelte";
  import { formatTokenAmount } from "../../utils";

  let _24hDecrease = 0;
  let hasKusdVaults = false;
  let hasUusdVaults = false;

  afterUpdate(() => {
    if ($store.xtzData.historic && $store.xtzData.historic.length > 1) {
      const yesterdayPrice =
        $store.xtzData.historic[$store.xtzData.historic.length - 2].price;
      const todayPrice = $store.xtzData.exchangeRate;
      const difference = ((todayPrice - yesterdayPrice) / todayPrice) * 100;
      if (difference < 0 && Math.abs(difference) > 5) {
        _24hDecrease = Math.abs(difference);
        // checks if user has vaults on Youves or Kolibri
        if (
          $localStorageStore.kUsdVaults &&
          $localStorageStore.kUsdVaults.length > 0
        ) {
          hasKusdVaults = true;
        } else {
          hasKusdVaults = false;
        }
        if (
          $localStorageStore.uUsdVaults &&
          $localStorageStore.uUsdVaults.length > 0
        ) {
          hasUusdVaults = true;
        } else {
          hasUusdVaults = false;
        }
      } else {
        _24hDecrease = 0;
        hasKusdVaults = false;
        hasUusdVaults = false;
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    border-right: solid 2px $border-color;
    display: grid;
    grid-template-rows: 10% 60% 20% 10%;
    align-items: flex-start;
    position: relative;

    .logo {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.4rem;

      img {
        width: 50px;
        height: 50px;
      }
    }

    .links {
      padding: 20px 0px 20px 40px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      width: 70%;

      a {
        width: 100%;
        text-decoration: none;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        color: inherit;
        padding: 5px;
        margin: 3px;

        &.selected {
          background-color: lighten($container-bg-color, 60);
          border-radius: 10px;
        }
      }
    }

    .decrease-alert {
      background-color: $error-red;
      color: white;
      border-radius: 10px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      width: 70%;

      a {
        text-decoration: none;
        color: inherit;
        font-weight: bold;

        &:hover {
          text-decoration: underline;
        }
      }

      & > div {
        margin: 3px 0px;
      }
    }
  }
</style>

<section>
  <div class="logo">
    <img src="images/logo.png" alt="my-tezos-defi-logo" />
    &nbsp; My Tezos Defi
  </div>
  <div class="links">
    <a href="#/" class:selected={$location === "/"}>
      <span class="material-icons"> home </span>
      &nbsp; Home
    </a>
    {#if $store.userAddress}
      <a href="#/tokens" class:selected={$location === "/tokens"}>
        <span class="material-icons"> toll </span>
        &nbsp; My tokens
      </a>
      <a href="#/farms" class:selected={$location === "/farms"}>
        <span class="material-icons"> agriculture </span>
        &nbsp; My farms
      </a>
      <a href="#/vaults" class:selected={$location === "/vaults"}>
        <span class="material-icons"> savings </span>
        &nbsp; My vaults
      </a>
      <a
        href={`#/profile/${$store.userAddress}`}
        class:selected={$location === "/profile"}
      >
        <span class="material-icons"> portrait </span>
        &nbsp; My profile
      </a>
    {/if}
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <a href="#/swaps" class:selected={$location === "/swaps"}>
        <span class="material-icons"> swap_horiz </span>
        &nbsp; Swaps
      </a>
    {/if}
    <a
      href="#/liquidity-baking"
      class:selected={$location === "/liquidity-baking"}
    >
      <span class="material-icons"> bakery_dining </span>
      &nbsp; LB DEX
    </a>
    <a href="#/stats" class:selected={$location === "/stats"}>
      <span class="material-icons"> insights </span>
      &nbsp; Stats
    </a>
    <a href="#/traffic" class:selected={$location === "/traffic"}>
      <span class="material-icons"> traffic </span>
      &nbsp; Traffic
    </a>
    <!--<a href="#/profile" class:selected={$location === "/profile"}>
      <span class="material-icons"> account_circle </span>
      &nbsp; Profile
    </a>-->
    <a href="#/settings" class:selected={$location === "/settings"}>
      <span class="material-icons"> settings </span>
      &nbsp; Settings
    </a>
  </div>
  {#if _24hDecrease && (hasKusdVaults || hasUusdVaults)}
    <div class="decrease-alert">
      <div>
        The price of XTZ has decreased more than {formatTokenAmount(
          _24hDecrease,
          2
        )}% in the last 24 hours.
      </div>
      <div>
        You may want to check your
        {#if hasKusdVaults && hasUusdVaults}
          <a
            href="https://kolibri.finance/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Kolibri
          </a>
          and
          <a
            href="https://app.youves.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Youves
          </a> vaults
        {:else if hasKusdVaults && !hasUusdVaults}
          <a
            href="https://kolibri.finance/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Kolibri
          </a> ovens
        {:else if !hasKusdVaults && hasUusdVaults}
          <a
            href="https://app.youves.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Youves
          </a> vaults
        {/if}
        .
      </div>
    </div>
  {:else}
    <div />
  {/if}
  <div>
    <FavoriteTokenDisplay />
  </div>
</section>
