<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import {
    CONTRACTS,
    Network,
    StableCoinClient,
    HarbingerClient,
    OvenClient
  } from "@hover-labs/kolibri-js";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { shortenHash, formatTokenAmount } from "../../../utils";

  export let address;

  let lockedAmount: number | null = null;
  let kusdOutstanding: number | null = null;
  let kusdCollatUtilization: number | null = null;
  let kusdLastUpdate = 0;

  onMount(async () => {
    const getBalance = await $store.Tezos.tz.getBalance(address);
    if (getBalance) {
      lockedAmount = getBalance.toNumber() / 10 ** 6;
    } else {
      lockedAmount = 0;
    }

    let rpcUrl = $store.settings[$store.network].rpcUrl;
    if (window.localStorage) {
      const settingsStorage = window.localStorage.getItem("mtd");
      if (settingsStorage) {
        const settings = JSON.parse(settingsStorage);
        rpcUrl = settings.favoriteRpcUrl;
      }
    }

    const harbingerClient = new HarbingerClient(
      rpcUrl,
      CONTRACTS.MAIN.HARBINGER_NORMALIZER
    );
    const stableCoinClient = new StableCoinClient(
      rpcUrl,
      Network.Mainnet,
      CONTRACTS.MAIN.OVEN_REGISTRY,
      CONTRACTS.MAIN.MINTER,
      CONTRACTS.MAIN.OVEN_FACTORY
    );
    const ovenClient = new OvenClient(
      rpcUrl,
      $store.Tezos.signer as any,
      address,
      stableCoinClient,
      harbingerClient
    );

    kusdOutstanding = (await ovenClient.getBorrowedTokens()).toNumber();
    const collat = await ovenClient.getCollateralizationRatio();
    console.log(kusdOutstanding, collat.toNumber() / 10 ** 18);
  });

  afterUpdate(async () => {
    if (kusdLastUpdate < Date.now() - 10 * 60000) {
      // move code here later
    }
  });
</script>

<div class="vault-row">
  <div class="icon">
    <img src="images/kUSD.png" alt="token-icon" />
  </div>
  <div>
    <a
      href={`https://better-call.dev/mainnet/${address}/operations`}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {shortenHash(address)}
    </a>
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
      on:click={() => localStorageStore.removeVault("kusd", address)}
    >
      <span class="material-icons"> delete </span>
    </button>
  </div>
</div>
<div class="vault-sub-row">
  <div />
  <div class="stats">
    <div>
      Minted kUSD: {kusdOutstanding
        ? formatTokenAmount(kusdOutstanding / 10 ** $store.tokens.kUSD.decimals)
        : "---"} kUSD
    </div>
    <div>Collateral utilization: {kusdCollatUtilization ?? "---"}%</div>
    <div>:)</div>
  </div>
</div>
