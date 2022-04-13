<script lang="ts">
  import { afterUpdate } from "svelte";
  import Wallet from "./Wallet.svelte";
  import logoPic from "../assets/logo.png";
  import twitterLogo from "../assets/twitter-circled.svg";
  import telegramLogo from "../assets/telegram-app.svg";
  import githubLogo from "../assets/github.svg";
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

    .contact-links {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 20px 0px;

      a {
        text-decoration: none;
      }

      img {
        width: 32px;
      }
    }
  }
</style>

<div class="menu">
  <div>
    <Wallet
      on:new-user={event => {
        if (liveTrafficWorker) {
          liveTrafficWorker.postMessage({
            type: "new-user",
            payload: event.detail
          });
        }
      }}
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
    <div class="contact-links">
      <a
        href="https://twitter.com/MyTezosDefi"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={twitterLogo} alt="twitter" />
      </a>
      <a
        href="https://github.com/claudebarde/my-tezos-defi"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={githubLogo} alt="github" />
      </a>
      <a
        href="https://t.me/+KzrVBZ9u8EhjYjI0"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={telegramLogo} alt="telegram" />
      </a>
    </div>
    <div>
      <img src={logoPic} alt="logo" />
      <span>My Tezos Defi</span>
    </div>
  </div>
</div>
