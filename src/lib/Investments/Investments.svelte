<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import { getKolibriOvens } from "../../utils";
  import type { KolibriOvenData } from "../../types";
  import Row from "./Row.svelte";

  let kolibriOvens: KolibriOvenData[] = [];
  let kolibriOvensChecked = false;

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
        <div>Value in {$store.xtzData.toFiat}</div>
      </div>
      {#each Object.entries($store.investments)
        .filter(inv => inv[1].platform === "quipuswap")
        .filter(inv => inv[1].balance) as [contractName, data]}
        <Row {data} platform={data.platform} />
      {/each}
      <div class="row header">
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>Stake in XTZ</div>
        <div>Reward</div>
      </div>
      {#each Object.entries($store.investments)
        .filter(inv => inv[1].platform === "plenty")
        .filter(inv => inv[1].balance) as [contractName, data]}
        <Row {data} platform={data.platform} />
      {/each}
      <div class="row header">
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>Stake in XTZ</div>
        <div>Reward</div>
      </div>
      {#each Object.entries($store.investments).filter(inv => inv[1].platform === "crunchy") as [contractName, data]}
        <Row {data} platform={data.platform} />
      {/each}

      <!--<div class="row">
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>Stake in XTZ</div>
        <div>Reward</div>
      </div>
      {#each Object.entries($store.investments) as [contractName, data]}
        {#if data.balance > 0}
          <div class="row">
            <div class="icon">
              {#each data.icons as icon}
                <img src={`images/${icon}.png`} alt="token-icon" />
              {/each}
            </div>
            <div>
              <a
                href={`https://better-call.dev/mainnet/${
                  data.address[$store.network]
                }/operations`}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {data.alias}
              </a>
            </div>
            <div>{data.balance / 10 ** data.decimals}</div>
            {#if data.alias !== "PLENTY-XTZ LP farm" && $store.tokensExchangeRates[data.token]}
              <div>
                <span>
                  {+(
                    (data.balance / 10 ** data.decimals) *
                    $store.tokensExchangeRates[data.token].tokenToTez
                  ).toFixed(5) / 1}
                </span>
              </div>
              {#if data.platform === "plenty"}
                <div>
                  {#if loadingPlentyRewards}
                    Calculating...
                  {:else if plentyRewards[contractName]}
                    {plentyRewards[contractName].toFixed(5)}
                  {:else}
                    --
                  {/if}
                </div>
              {:else}
                <div>--</div>
              {/if}
              <div>
                <PoolManagement
                  contractAddress={data.address[$store.network]}
                  alias={data.alias}
                />
              </div>
            {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
              <div>
                <span>
                  {+calcTotalShareValueInTez(
                    data.balance,
                    data.shareValueInTez,
                    $store.tokensExchangeRates.PLENTY.tokenToTez,
                    $store.tokens.PLENTY.decimals
                  ).toFixed(5) / 1}
                </span>
              </div>
              {#if data.platform === "plenty"}
                <div>
                  {#if loadingPlentyRewards}
                    Calculating...
                  {:else if plentyRewards[contractName]}
                    {plentyRewards[contractName].toFixed(5)}
                  {:else}
                    --
                  {/if}
                </div>
              {:else}
                <div>--</div>
              {/if}
            {:else}
              <div>--</div>
              <div>--</div>
            {/if}
          </div>
        {:else if contractName === "CRUNCHY-FARMS"}          
          {#each data.info as farm}
            {#if farm.farmId < 3}
              <div class="row">
                <div class="icon">
                  {#if farm.farmId == 0}
                    <img src="images/XTZ.png" alt="token-icon" />
                    <img src="images/CRUNCH.png" alt="token-icon" />
                  {:else if farm.farmId == 1}
                    <img src="images/XTZ.png" alt="token-icon" />
                    <img src="images/kUSD.png" alt="token-icon" />
                  {:else if farm.farmId == 2}
                    <img src="images/XTZ.png" alt="token-icon" />
                    <img src="images/wWBTC.png" alt="token-icon" />
                  {:else}
                    <img src="images/crDAO.png" alt="token-icon" />
                  {/if}
                </div>
                <div>
                  <a
                    href={`https://better-call.dev/mainnet/${
                      data.address[$store.network]
                    }/operations`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {#if farm.farmId == 0}
                      Crunchy Farm XTZ/CRUNCH
                    {:else if farm.farmId == 1}
                      Crunchy Farm XTZ/kUSD
                    {:else if farm.farmId == 2}
                      Crunchy Farm XTZ/wWBTC
                    {:else}
                      {data.alias}
                    {/if}
                  </a>
                </div>
                <div>{farm.amount / 10 ** data.decimals}</div>
                <div>
                  {#if farm.farmId == 0 && $store.tokensExchangeRates.CRUNCH}
                    {+calcTotalShareValueInTez(
                      farm.amount,
                      farm.shareValueInTez,
                      $store.tokensExchangeRates.CRUNCH.tokenToTez,
                      $store.tokens.CRUNCH.decimals
                    ).toFixed(5) / 1}
                  {:else if farm.farmId == 1 && $store.tokensExchangeRates.kUSD}
                    {+calcTotalShareValueInTez(
                      farm.amount,
                      farm.shareValueInTez,
                      $store.tokensExchangeRates.KUSD.tokenToTez,
                      $store.tokens.KUSD.decimals
                    ).toFixed(5) / 1}
                  {:else if farm.farmId == 2 && $store.tokensExchangeRates.wWBTC}
                    {+calcTotalShareValueInTez(
                      farm.amount,
                      farm.shareValueInTez,
                      $store.tokensExchangeRates.wWBTC.tokenToTez,
                      $store.tokens.wWBTC.decimals
                    ).toFixed(5) / 1}
                  {:else}
                    --
                  {/if}
                </div>
                <div>--</div>
              </div>
            {/if}
          {/each}
        {/if}
      {/each}-->
    {/if}
  </div>
</div>
