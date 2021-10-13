<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { shortenHash } from "../../utils";

  export let address, platform, valueInXtz;

  let lockedAmount: number | null = null;
  let iconPath;

  onMount(async () => {
    if (platform == "wxtz") {
      iconPath = $store.tokens.wXTZ.thumbnail;
      const getBalance = await $store.Tezos.tz.getBalance(address);
      if (getBalance) {
        lockedAmount = getBalance.toNumber() / 10 ** 6;
      } else {
        lockedAmount = 0;
      }
    } else if (platform == "kusd") {
      iconPath = "images/kusd.png";
      const getBalance = await $store.Tezos.tz.getBalance(address);
      if (getBalance) {
        lockedAmount = getBalance.toNumber() / 10 ** 6;
      } else {
        lockedAmount = 0;
      }
    } else if (platform == "uusd") {
      iconPath = $store.tokens.uUSD.thumbnail;
      const getBalance = await $store.Tezos.tz.getBalance(address);
      if (getBalance) {
        lockedAmount = getBalance.toNumber() / 10 ** 6;
      } else {
        lockedAmount = 0;
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .row {
    display: grid;
    grid-template-columns: 10% 25% 20% 17% 16% 12%;
    padding: 10px;
    align-items: center;
    transition: 0.3s;

    &:hover {
      background-color: lighten($container-bg-color, 65);
    }

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .icon {
      img {
        width: 25px;
        height: 25px;
      }
    }
  }
</style>

<div class="row">
  <div class="icon">
    <img src={iconPath} alt="token-icon" />
  </div>
  <div>
    {#if platform === "uusd"}
      <a
        href={`https://app.youves.com/uusd/detail/${address}`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {shortenHash(address)}
      </a>
    {:else}
      <a
        href={`https://better-call.dev/mainnet/${address}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {shortenHash(address)}
      </a>
    {/if}
  </div>
  <div>
    {#if valueInXtz}
      {lockedAmount ?? "--"} ꜩ
    {:else}
      {lockedAmount * $store.xtzData.exchangeRate}
      {$localStorageStore.preferredFiat}
    {/if}
  </div>
  <div />
  <div />
  <div>
    <button
      class="mini"
      on:click={() => localStorageStore.removeVault(platform, address)}
    >
      <span class="material-icons"> delete </span>
    </button>
  </div>
</div>
