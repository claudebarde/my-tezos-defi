<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { getKolibriOvens } from "../../utils";
  import type { KolibriOvenData } from "../../types";
  import Row from "./Row.svelte";

  let kolibriOvens: KolibriOvenData[] = [];
  let kolibriOvensChecked = false;
  let plentyValueInXtz = true;
  let showEmptyPlentyPools = false;

  const shortenHash = (hash: string): string =>
    hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";

  afterUpdate(async () => {
    // finds if user has Kolibri ovens
    if ($store.userAddress && !kolibriOvensChecked) {
      const ovens = await getKolibriOvens($store.userAddress, $store.Tezos);
      if (ovens) {
        kolibriOvens = [...ovens];
        kolibriOvensChecked = true;
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .container-investments {
    .row {
      display: grid;
      grid-template-columns: 10% 25% 20% 17% 17% 11%;
      padding: 5px 10px;
      align-items: center;

      &.header {
        background-color: darken($container-bg-color, 3);

        &:not(:first-child) {
          border-top: solid 4px $border-color;
          margin: 5px 0px;
        }
        &:first-child {
          padding: 10px;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
        }
      }
    }
  }
</style>

<div class="container">
  <div class="title">Investments</div>
  <div class="container-investments">
    {#if Object.values($store.investments).every(inv => inv.balance === undefined)}
      <div class="row">
        <div style="grid-column:1 / span 2">Waiting for update...</div>
      </div>
    {:else if Object.values($store.investments).every(inv => inv.balance === 0) && $store.investments["CRUNCHY-FARMS"].info.length === 0}
      <div class="row">
        <div style="grid-column:1 / span 2">No investment found</div>
      </div>
    {:else}
      {#if kolibriOvens.length > 0 && kolibriOvens.filter(oven => !oven.isLiquidated).length > 0}
        <div class="row header">
          <div />
          <div>Kolibri oven</div>
          <div>Locked</div>
          <div>Borrowed</div>
        </div>
        {#each kolibriOvens as oven}
          {#if !oven.isLiquidated}
            <div class="row">
              <div class="icon">
                <img src="images/kUSD.png" alt="token-icon" />
              </div>
              <div>
                <a
                  href={`https://better-call.dev/mainnet/${oven.address}/operations`}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {shortenHash(oven.address)}
                </a>
              </div>
              <div>{+oven.locked / 10 ** 6} ꜩ</div>
              <div>{+oven.borrowed / 10 ** 18} kUSD</div>
            </div>
          {/if}
        {/each}
        <div class="row break-line" />
      {/if}
      <div class="row header">
        <div />
        <div>Contract</div>
        <div>Tokens</div>
        <div>Value in XTZ</div>
        <div>Value in {$localStorageStore.preferredFiat}</div>
      </div>
      {#each Object.entries($store.investments)
        .filter(inv => inv[1].platform === "quipuswap")
        .filter(inv => inv[1].balance) as [contractName, data]}
        <Row {data} platform={data.platform} valueInXtz={true} />
      {/each}
      <div class="row header">
        <div>
          <span
            class="material-icons"
            style="vertical-align:middle;cursor:pointer"
            on:click={() => (showEmptyPlentyPools = !showEmptyPlentyPools)}
          >
            {#if showEmptyPlentyPools}
              visibility_off
            {:else}
              visibility
            {/if}
          </span>
        </div>
        <div>Contract</div>
        <div>Stake</div>
        <div>
          Stake in {plentyValueInXtz ? "XTZ" : $localStorageStore.preferredFiat}
        </div>
        <div>Reward</div>
      </div>
      {#each Object.entries($store.investments)
        .filter(inv => inv[1].platform === "plenty")
        .filter( inv => (showEmptyPlentyPools ? inv : inv[1].balance) ) as [_, data] (data.alias)}
        <Row {data} platform={data.platform} valueInXtz={plentyValueInXtz} />
      {/each}
      <div class="row">
        <div />
        <div />
        <div />
        <div>
          <button
            class="button investments"
            on:click={() => (plentyValueInXtz = !plentyValueInXtz)}
          >
            {#if plentyValueInXtz}
              Show {$localStorageStore.preferredFiat}
            {:else}
              Show XTZ
            {/if}
          </button>
        </div>
        <div>
          <!--
          -->
          <button class="button investments">Harvest all</button>
        </div>
      </div>
      {#if Object.values($store.investments)
        .filter(inv => inv.platform === "crunchy")
        .some(data => data.info.some(farm => farm.amount > 0))}
        <div class="row header">
          <div />
          <div>Contract</div>
          <div>Stake</div>
          <div>Stake in XTZ</div>
          <div>Reward</div>
        </div>
        {#each Object.entries($store.investments).filter(inv => inv[1].platform === "crunchy") as [contractName, data]}
          <Row {data} platform={data.platform} valueInXtz={true} />
        {/each}
      {/if}
    {/if}
  </div>
</div>
