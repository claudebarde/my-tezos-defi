<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { shortenHash, formatTokenAmount } from "../../utils";

  export let address, platform;

  let lockedAmount: number | null = null;
  let iconPath;

  let ctezOutstanding: number | null = null;
  let collatUtilization: number | null = null;
  let ctezLastUpdate = 0;

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

  afterUpdate(async () => {
    if (platform == "ctez" && ctezLastUpdate < Date.now() - 10 * 60000) {
      ctezLastUpdate = Date.now();
      // finds minted Ctez
      if ($store.Tezos && $store.tokens && $store.tokens.Ctez) {
        // gets vault id
        const vault = await $store.Tezos.wallet.at(address);
        const vaultStorage: any = await vault.storage();
        const vaultId = vaultStorage.handle.id.toNumber();
        // finds Ctez balance
        const contract = await $store.Tezos.wallet.at(
          "KT1GWnsoFZVHGh7roXEER3qeCcgJgrXT3de2"
        );
        const storage: any = await contract.storage();
        const balance = await storage.ovens.get({
          id: vaultId,
          owner: $store.userAddress
        });
        if (balance.ctez_outstanding) {
          ctezOutstanding = balance.ctez_outstanding.toNumber();
          collatUtilization = +(
            (ctezOutstanding / balance.tez_balance.toNumber()) *
            100
          ).toFixed(2);
        } else {
          ctezOutstanding = 0;
        }
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .row {
    display: grid;
    grid-template-columns: 10% 25% 37% 16% 12%;
    padding: 10px;
    align-items: center;
    transition: 0.3s;
    background-color: lighten($container-bg-color, 65);
    margin-top: 10px;

    &:not(.ctez-row) {
      border-radius: 10px;
    }
    &.ctez-row {
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
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

  .sub-row {
    display: grid;
    grid-template-columns: 10% 80% 10%;
    padding: 10px;
    align-items: center;
    transition: 0.3s;
    font-size: 0.9rem;
    background-color: lighten($container-bg-color, 65);
    border-bottom-left-radius: 10px;
    border-bottom-right-radius: 10px;

    .stats {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
  }
</style>

<div class="row" class:ctez-row={platform === "ctez"}>
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
{#if platform === "ctez"}
  <div class="sub-row">
    <div />
    <div class="stats">
      <div>
        Minted Ctez: {ctezOutstanding
          ? formatTokenAmount(ctezOutstanding / 10 ** 6)
          : "---"} Ctez
      </div>
      <div>Collateral utilization: {collatUtilization ?? "---"}%</div>
      <div>
        {#if collatUtilization && collatUtilization < 80}
          <span class="material-icons"> sentiment_satisfied_alt </span>
        {:else if collatUtilization && collatUtilization >= 80 && collatUtilization <= 90}
          <span class="material-icons"> sentiment_neutral </span>
        {:else if collatUtilization && collatUtilization > 90}
          <span class="material-icons"> sentiment_dissatisfied </span>
        {/if}
      </div>
    </div>
  </div>
{/if}
