<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { fly } from "svelte/transition";
  import Wallet from "./Wallet.svelte";
  import logoPic from "../assets/logo.png";
  import twitterLogo from "../assets/twitter-circled.svg";
  import telegramLogo from "../assets/telegram-app.svg";
  import githubLogo from "../assets/github.svg";
  import LiveTrafficWorker from "../livetraffic.worker?worker";
  import store from "../store";
  import config from "../config";
  import { LocalStorage, type FiatData } from "../localStorage";
  import { formatTokenAmount } from "../utils";
  import toastStore from "../toastStore";
  import { ToastType, AvailableFiat } from "../types";

  let liveTrafficWorker;
  let hidden, visibilityChange;
  let showMobileMenuSidebar: boolean | undefined = undefined;
  let currentFiat: FiatData;

  const handleLiveTrafficWorker = message => {
    if (message.data.type === "new-level") {
      const level = message.data.payload;
      store.updateCurrentLevel(level);
    } else if (message.data.type === "new-transfers") {
      // loads token data
      message.data.payload.forEach(transfer => {
        const token = Object.values($store.tokens).find(
          val =>
            val.address === transfer.tokenAddress &&
            (transfer.tokenId ? val.tokenId === transfer.tokenId : true)
        );
        if (token) {
          const message = (() => {
            if (transfer.inOrOut === "in") {
              return `You just received ${formatTokenAmount(
                transfer.amount / 10 ** token.decimals
              )} ${token.id}!`;
            } else {
              return `You just spent ${formatTokenAmount(
                transfer.amount / 10 ** token.decimals
              )} ${token.id}!`;
            }
          })();
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const notif = new Notification("New transfer", {
              body: message,
              icon: `tokens/${token.id}.png`,
              requireInteraction: true
            });
            setTimeout(() => notif.close(), 10_000);
          } else {
            toastStore.addToast({
              type: ToastType.INFO,
              message,
              dismissable: true
            });
          }
        }
      });
    } else if (message.data.type === "lb-data") {
      const { tokenPool, xtzPool, lqtTotal } = message.data.payload;
      if (!isNaN(+tokenPool) && !isNaN(+xtzPool) && !isNaN(+lqtTotal)) {
        store.updateLbData({
          tokenPool: +tokenPool,
          xtzPool: +xtzPool,
          lqtTotal: +lqtTotal
        });
      }
    }
  };

  const handleVisibilityChange = () => {
    if (document[hidden] && $store.localStorage) {
      // saves the last level when user switches tabs
      $store.localStorage.updateLastActiveLevel($store.currentLevel);
    }
  };

  onMount(() => {
    if (typeof document.hidden !== "undefined") {
      // Opera 12.10 and Firefox 18 and later support
      hidden = "hidden";
      visibilityChange = "visibilitychange";
    } else if (typeof document.msHidden !== "undefined") {
      hidden = "msHidden";
      visibilityChange = "msvisibilitychange";
    } else if (typeof document.webkitHidden !== "undefined") {
      hidden = "webkitHidden";
      visibilityChange = "webkitvisibilitychange";
    }

    document.addEventListener(visibilityChange, handleVisibilityChange, false);
  });

  afterUpdate(() => {
    if (!liveTrafficWorker && $store.tokens && $store.investments) {
      liveTrafficWorker = new LiveTrafficWorker();
      liveTrafficWorker.postMessage({
        type: "init",
        payload: {
          tokens: { ...$store.tokens },
          farms: [
            ...Object.entries($store.investments).map(([invId, invData]) => ({
              id: invId,
              address: invData.address
            }))
          ],
          vaults: [],
          lbDex: [...config.lbContracts],
          rpcUrl: LocalStorage.getRpcUrl()
        }
      });
      liveTrafficWorker.onmessage = handleLiveTrafficWorker;
    }

    if ($store.localStorage) {
      currentFiat = $store.localStorage.getFavoriteFiat();
    } else {
      currentFiat = config.validFiats.find(
        fiat => fiat.code === AvailableFiat.USD
      );
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .menu {
    padding: 15px;
  }

  .menu,
  .mobile-menu {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
    background-color: $light-cyan;

    p {
      text-align: center;
      font-size: 0.8rem;
    }

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

  .mobile-menu,
  .mobile-menu__button {
    display: none;
  }

  @media (max-width: $mobile-breakpoint) {
    .menu {
      display: none;
    }

    .mobile-menu__button {
      display: block;
      background-color: $light-cyan;
      z-index: 999;
      transform: translate(2vw, 2vw);

      &.to-left {
        animation: menu-to-left 0.6s forwards;
      }
      &.to-right {
        animation: menu-to-right 0.6s forwards;
      }
    }

    .mobile-menu {
      padding: 20px;
      display: flex;
      position: absolute;
      top: 0px;
      left: 0px;
      height: calc(100vh - 40px);
      width: 60vw;
      z-index: 990;
    }
  }

  @keyframes menu-to-right {
    0% {
      transform: translate(2vw, 2vw) rotate(15deg);
    }

    99% {
      transform: translate(calc(98vw - 44px), 2vw) rotate(15deg);
    }

    100% {
      transform: translate(calc(98vw - 44px), 2vw) rotate(0deg);
    }
  }

  @keyframes menu-to-left {
    0% {
      transform: translate(calc(98vw - 44px), 2vw) rotate(-15deg);
    }

    99% {
      transform: translate(2vw, 2vw) rotate(-15deg);
    }

    100% {
      transform: translate(2vw, 2vw) rotate(0deg);
    }
  }
</style>

<!-- DESKTOP MENU -->
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
      <a href="#/">
        <button class="nav">
          <span class="material-icons-outlined"> toll </span>
          <span>My tokens</span>
        </button>
      </a>
      <a href="#/farms">
        <button class="nav">
          <span class="material-icons-outlined"> agriculture </span>
          <span>My farms</span>
        </button>
      </a>
      <a href="#/vaults">
        <button class="nav">
          <span class="material-icons-outlined"> savings </span>
          <span>My vaults</span>
        </button>
      </a>
      <a href="#/liquidity-baking">
        <button class="nav">
          <span class="material-icons-outlined"> bakery_dining </span>
          <span>LB DEX</span>
        </button>
      </a>
      {#if $store.userAddress}
        <a href={`#/profile/${$store.userAddress}`}>
          <button class="nav">
            <span class="material-icons-outlined"> portrait </span>
            <span>My profile</span>
          </button>
        </a>
      {/if}
      <a href="#/settings">
        <button class="nav">
          <span class="material-icons-outlined"> settings </span>
          <span>Settings</span>
        </button>
      </a>
    </nav>
  </div>
  <div>
    {#if $store.xtzExchangeRate && currentFiat}
      <p>
        1 XTZ = {formatTokenAmount($store.xtzExchangeRate, 2)}
        {currentFiat.code}
      </p>
    {/if}
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
<!-- MOBILE MENU -->
<button
  class="transparent mobile-menu__button"
  class:to-left={showMobileMenuSidebar === false}
  class:to-right={showMobileMenuSidebar === true}
  on:click={() => (showMobileMenuSidebar = !showMobileMenuSidebar)}
>
  <!-- class:open-menu={showMobileMenuSidebar} -->
  {#if showMobileMenuSidebar}
    <span class="material-icons-outlined" style="margin-right: 0px">
      close
    </span>
  {:else}
    <span class="material-icons-outlined" style="margin-right: 0px">
      menu
    </span>
  {/if}
</button>
{#if showMobileMenuSidebar}
  <div class="mobile-menu" transition:fly={{ duration: 400, x: -200 }}>
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
        <button class="nav" on:click={() => (showMobileMenuSidebar = false)}>
          <span class="material-icons-outlined"> toll </span>
          <span>My tokens</span>
        </button>
      </a>
      <a href="/farms">
        <button class="nav" on:click={() => (showMobileMenuSidebar = false)}>
          <span class="material-icons-outlined"> agriculture </span>
          <span>My farms</span>
        </button>
      </a>
      <a href="/vaults">
        <button class="nav" on:click={() => (showMobileMenuSidebar = false)}>
          <span class="material-icons-outlined"> savings </span>
          <span>My vaults</span>
        </button>
      </a>
      <a href="/liquidity-baking">
        <button class="nav" on:click={() => (showMobileMenuSidebar = false)}>
          <span class="material-icons-outlined"> bakery_dining </span>
          <span>LB DEX</span>
        </button>
      </a>
      {#if $store.userAddress}
        <a href={`/profile/${$store.userAddress}`}>
          <button class="nav" on:click={() => (showMobileMenuSidebar = false)}>
            <span class="material-icons-outlined"> portrait </span>
            <span>My profile</span>
          </button>
        </a>
      {/if}
      <a href="/settings">
        <button class="nav" on:click={() => (showMobileMenuSidebar = false)}>
          <span class="material-icons-outlined"> settings </span>
          <span>Settings</span>
        </button>
      </a>
    </nav>
    <div>
      {#if $store.xtzExchangeRate}
        <p>
          1 XTZ = {formatTokenAmount($store.xtzExchangeRate, 2)}
          {currentFiat}
        </p>
      {/if}
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
{/if}
