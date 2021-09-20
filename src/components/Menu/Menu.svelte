<script lang="ts">
  import { location } from "svelte-spa-router";
  import store from "../../store";
  import FavoriteTokenDisplay from "./FavoriteTokensDisplay.svelte";
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    border-right: solid 2px $border-color;
    display: grid;
    grid-template-rows: 10% 80% 10%;
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
    {/if}
    <a
      href="#/liquidity-baking"
      class:selected={$location === "/liquidity-baking"}
    >
      <span class="material-icons"> bakery_dining </span>
      &nbsp; LB DEX
    </a>
    <!--<a href="#/exchange" class:selected={$location === "/exchange"}>
      <span class="material-icons"> swap_horiz </span>
      &nbsp; Exchange
    </a>-->
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
  <div>
    <FavoriteTokenDisplay />
  </div>
</section>
