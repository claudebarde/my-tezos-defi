<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import { calcTotalShareValueInTez, getKolibriOvens } from "../../utils";
  import type { KolibriOvenData } from "../../types";

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
      grid-template-columns: 10% 25% 20% 20% 20%;
      padding: 5px 10px;

      &.break-line {
        border-bottom: solid 2px $border-color;
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
  }
</style>

<div class="container">
  <div class="title">Investments</div>
  <div class="container-investments">
    {#if Object.values($store.investments).every(inv => inv.balance === undefined)}
      <div class="row">
        <div style="grid-column:1 / span 2">Waiting for update...</div>
      </div>
    {:else if Object.values($store.investments).every(inv => inv.balance === 0)}
      <div class="row">
        <div style="grid-column:1 / span 2">No investment found</div>
      </div>
    {:else}
      {#if kolibriOvens.length > 0 && kolibriOvens.filter(oven => !oven.isLiquidated).length > 0}
        <div class="row">
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
      <div class="row">
        <div />
        <div>Contract</div>
        <div>Balance</div>
        <div>Value in XTZ</div>
        <div>Value in USD</div>
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
            <div>
              {#if ["Plenty hDAO staking", "Plenty staking", "Plenty USDtz staking"].includes(data.alias) && $store.tokensExchangeRates[data.token]}
                {+(
                  (data.balance / 10 ** data.decimals) *
                  $store.tokensExchangeRates[data.token].tokenToTez
                ).toFixed(5) / 1}
              {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
                {+calcTotalShareValueInTez(
                  data.balance,
                  data.shareValueInTez,
                  $store.tokensExchangeRates.PLENTY.tokenToTez,
                  $store.tokens.PLENTY.decimals
                ).toFixed(5) / 1}
              {:else}
                --
              {/if}
            </div>
            <div>
              {#if ["Plenty hDAO staking", "Plenty staking", "Plenty USDtz staking"].includes(data.alias) && $store.tokensExchangeRates[data.token]}
                {+(
                  (data.balance / 10 ** data.decimals) *
                  $store.tokensExchangeRates[data.token].tokenToTez *
                  $store.xtzData.exchangeRate
                ).toFixed(5) / 1}
              {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
                {+(
                  calcTotalShareValueInTez(
                    data.balance,
                    data.shareValueInTez,
                    $store.tokensExchangeRates.PLENTY.tokenToTez,
                    $store.tokens.PLENTY.decimals
                  ) * $store.xtzData.exchangeRate
                ).toFixed(5) / 1}
              {:else}
                --
              {/if}
            </div>
          </div>
        {:else if contractName === "CRUNCHY-FARMS"}
          <!-- CRUNCHY FARMS have a zero balance but data in the info array -->
          {#each data.info as farm}
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
                {#if $store.tokensExchangeRates.CRUNCH}
                  {+calcTotalShareValueInTez(
                    farm.amount,
                    data.shareValueInTez,
                    $store.tokensExchangeRates.CRUNCH.tokenToTez,
                    $store.tokens.CRUNCH.decimals
                  ).toFixed(5) / 1}
                {:else}
                  --
                {/if}
              </div>
              <div>
                {#if $store.tokensExchangeRates.CRUNCH}
                  {+(
                    calcTotalShareValueInTez(
                      farm.amount,
                      data.shareValueInTez,
                      $store.tokensExchangeRates.CRUNCH.tokenToTez,
                      $store.tokens.CRUNCH.decimals
                    ) * $store.xtzData.exchangeRate
                  ).toFixed(5) / 1}
                {:else}
                  --
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      {/each}
    {/if}
  </div>
</div>
