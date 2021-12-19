<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { shortenHash, formatTokenAmount } from "../../utils";

  export let address, platform;

  let lockedAmount: number | null = null;
  let iconPath;

  onMount(async () => {
    if (platform == "wxtz") {
      iconPath = "images/wXTZ.png";
    } else if (platform == "kusd") {
      iconPath = "images/kUSD.png";
    } else if (platform == "uusd") {
      iconPath = "images/uUSD.png";
    } else if (platform == "ctez") {
      iconPath = "images/Ctez.png";
    }

    const getBalance = await $store.Tezos.tz.getBalance(address);
    if (getBalance) {
      lockedAmount = getBalance.toNumber() / 10 ** 6;
    } else {
      lockedAmount = 0;
    }
  });
</script>

<div class="vault-row" class:ctez-row={platform === "ctez"}>
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
    {#if lockedAmount || lockedAmount === 0}
      <span>
        {lockedAmount} ꜩ
      </span>
      <span style="font-size:0.8rem">
        ({formatTokenAmount(lockedAmount * $store.xtzData.exchangeRate, 2)}
        {$localStorageStore.preferredFiat})
      </span>
    {:else}
      <span class="material-icons"> hourglass_empty </span>
    {/if}
  </div>
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
