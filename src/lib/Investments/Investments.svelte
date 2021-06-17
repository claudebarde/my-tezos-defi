<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import config from "../../config";

  let kolibriOvens: { address: string; locked: number; borrowed: number }[] =
    [];
  let kolibriOvensChecked = false;

  const shortenHash = (hash: string): string =>
    hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";

  const calcTotalShareValueInTez = (
    tokensOwned: number,
    shareValueInTez: number,
    tokenToTezExchangeRate: number,
    tokenDecimals: number
  ): number => {
    const tezValue = shareValueInTez / 10 ** 6;
    const tokenValue =
      shareValueInTez /
      10 ** 6 /
      (tokenToTezExchangeRate / 10 ** tokenDecimals) /
      10 ** tokenDecimals;
    const tokenToTezValue = tokenValue * tokenToTezExchangeRate;

    return (tokensOwned / 10 ** tokenDecimals) * (tezValue + tokenToTezValue);
  };

  afterUpdate(async () => {
    // finds if user has Kolibri ovens
    if ($store.userAddress && !kolibriOvensChecked) {
      try {
        const response = await fetch(config.kolibriOvenOwnersUrl);
        if (response) {
          const data = await response.json();
          const { ovenData } = data;
          kolibriOvens = await Promise.all(
            ovenData
              .filter(d => d.ovenOwner === $store.userAddress)
              .map(async d => {
                const contract = await $store.Tezos.wallet.at(d.ovenAddress);
                const storage: any = await contract.storage();
                const balance = await $store.Tezos.tz.getBalance(d.ovenAddress);

                return {
                  address: d.ovenAddress,
                  locked: balance.toNumber(),
                  borrowed: storage.borrowedTokens.toNumber()
                };
              })
          );
        }

        kolibriOvensChecked = true;
      } catch (error) {
        console.log(error);
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
      padding: 3px 0px;

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
      {#if kolibriOvens.length > 0}
        <div class="row">
          <div />
          <div>Kolibri oven</div>
          <div>Locked</div>
          <div>Borrowed</div>
        </div>
        {#each kolibriOvens as oven}
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
            <div>{data.alias}</div>
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
                  $store.xtzFiatExchangeRate
                ).toFixed(5) / 1}
              {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
                {+(
                  calcTotalShareValueInTez(
                    data.balance,
                    data.shareValueInTez,
                    $store.tokensExchangeRates.PLENTY.tokenToTez,
                    $store.tokens.PLENTY.decimals
                  ) * $store.xtzFiatExchangeRate
                ).toFixed(5) / 1}
              {:else}
                --
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>
