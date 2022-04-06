<script lang="ts">
  import { afterUpdate } from "svelte";
  import Wallet from "./Wallet.svelte";
  import logoPic from "../assets/logo.png";
  import LiveTrafficWorker from "../livetraffic.worker?worker";
  import store from "../store";
  import config from "../config";

  let liveTrafficWorker;

  const handleLiveTrafficWorker = message => {
    if (message.data.type === "new-level") {
      store.updateCurrentLevel(message.data.payload);
    }
  };

  afterUpdate(() => {
    if (!liveTrafficWorker && $store.tokens && $store.investments) {
      liveTrafficWorker = new LiveTrafficWorker();
      liveTrafficWorker.postMessage({
        type: "init",
        payload: [
          ...Object.values($store.tokens).map(tk => tk.address),
          ...Object.values($store.investments).map(inv => inv.address),
          ...config.lbContracts
        ]
      });
      liveTrafficWorker.onmessage = handleLiveTrafficWorker;
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .menu {
    padding: 15px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
    background-color: $light-cyan;

    img {
      width: 38px;
      height: 38px;
      vertical-align: middle;
    }

    nav {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;

      & > a {
        margin: 5px 0px;
        padding: 0px;
        text-decoration: none;
      }
    }
  }
</style>

<div class="menu">
  <div>
    <Wallet
      on:new-user={event =>
        liveTrafficWorker.postMessage({
          type: "new-user",
          payload: event.detail
        })}
    />
    <nav>
      <a href="/">
        <button class="nav">
          <span class="material-icons-outlined"> toll </span>
          <span>My tokens</span>
        </button>
      </a>
      <a href="/farms">
        <button class="nav">
          <span class="material-icons-outlined"> agriculture </span>
          <span>My farms</span>
        </button>
      </a>
      <a href="/vaults">
        <button class="nav">
          <span class="material-icons-outlined"> savings </span>
          <span>My vaults</span>
        </button>
      </a>
      <a href="/liquidity-baking">
        <button class="nav">
          <span class="material-icons-outlined"> bakery_dining </span>
          <span>LB DEX</span>
        </button>
      </a>
      <a href="/profile">
        <button class="nav">
          <span class="material-icons-outlined"> portrait </span>
          <span>My profile</span>
        </button>
      </a>
      <a href="/settings">
        <button class="nav">
          <span class="material-icons-outlined"> settings </span>
          <span>Settings</span>
        </button>
      </a>
    </nav>
  </div>
  <div>
    <img src={logoPic} alt="logo" />
    <span>My Tezos Defi</span>
  </div>
</div>
