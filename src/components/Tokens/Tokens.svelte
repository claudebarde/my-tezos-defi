<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { push } from "svelte-spa-router";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import {
    searchUserTokens,
    formatTokenAmount,
    sortTokensByBalance
  } from "../../utils";
  import type { State, AvailableToken } from "../../types";

  let showSelectTokens = false;
  let totalHoldingInXtz = 0;
  let tokensStatsDaily:
    | {
        [p in AvailableToken]: {
          difference: number;
          increase: boolean;
        };
      }
    | {} = {};
  let tokensStatsWeekly:
    | {
        [p in AvailableToken]: {
          difference: number;
          increase: boolean;
        };
      }
    | {} = {};
  let tokensStatsRefresh;

  const addFavoriteToken = async tokenSymbol => {
    try {
      // adds token to favorite list
      localStorageStore.addFavoriteToken(tokenSymbol);
      // gets user's balance
      const userToken = await searchUserTokens({
        Tezos: $store.Tezos,
        userAddress: $store.userAddress,
        tokens: Object.entries($store.tokens).filter(tk =>
          $localStorageStore.favoriteTokens.includes(tk[0])
        )
      });
      if (userToken) {
        store.updateTokensBalances({
          ...$store.tokensBalances,
          [tokenSymbol]: userToken[tokenSymbol]
        });
      }
    } catch (error) {
      console.error(error);
      /*toastStore.addToast({
        type: error,
        text: "Couldn't add favorite token",
        dismissable: false
      });*/
    }
  };

  const removeFavoriteToken = async tokenSymbol => {
    // removes token from favorite list
    localStorageStore.removeFavoriteToken(tokenSymbol);
  };

  const fetchTokensStats = async () => {
    // fetches tokens stats
    const userTokens = Object.entries($store.tokens).filter(tk =>
      $localStorageStore.favoriteTokens.includes(tk[0])
    );
    const tokensAggregateWeeklyPromises = await Promise.allSettled(
      // [userTokens.find(tk => tk[0] === AvailableToken.PLENTY)]
      [...userTokens.filter(tk => tk[0] !== "xPLENTY")].map(
        async ([tokenId, tokenInfo]) => {
          if (tokenInfo.type === "fa1.2") {
            const url = `https://api.teztools.io/v1/${tokenInfo.address}/pools/${tokenInfo.dexContractAddress}/aggregate_daily`;
            return { tokenId, stats: await fetch(url) };
          } else if (tokenInfo.type === "fa2") {
            const url = `https://api.teztools.io/v1/${tokenInfo.address}_${tokenInfo.tokenId}/pools/${tokenInfo.dexContractAddress}/aggregate_daily`;
            return { tokenId, stats: await fetch(url) };
          }
        }
      )
    );
    const tokensAggregateWeekly = await Promise.all(
      tokensAggregateWeeklyPromises
        .filter(settled => settled.status === "fulfilled" && !!settled.value)
        .map(async res => ({
          tokenId: (res as PromiseFulfilledResult<any>).value.tokenId,
          stats: await (res as PromiseFulfilledResult<any>).value.stats.json()
        }))
    );
    const tokensWeekly = tokensAggregateWeekly.map(stats => ({
      tokenId: stats.tokenId,
      increase:
        stats.stats[stats.stats.length - 8].t1priceMa <
        $store.tokens[stats.tokenId].exchangeRate,
      difference: (() => {
        const priceBefore = stats.stats[stats.stats.length - 8].t1priceMa;
        const currentPrice = $store.tokens[stats.tokenId].exchangeRate;
        const difference =
          (priceBefore - currentPrice) / ((priceBefore + currentPrice) / 2);
        return Math.abs(difference * 100);
      })()
    }));
    tokensWeekly.forEach(item => {
      tokensStatsWeekly[item.tokenId] = {
        difference: item.difference,
        increase: item.increase
      };
    });
    const tokensDaily = tokensAggregateWeekly.map(stats => ({
      tokenId: stats.tokenId,
      increase:
        stats.stats[stats.stats.length - 2].t1priceMa <
        $store.tokens[stats.tokenId].exchangeRate,
      difference: (() => {
        const priceBefore = stats.stats[stats.stats.length - 2].t1priceMa;
        const currentPrice = $store.tokens[stats.tokenId].exchangeRate;
        const difference =
          (priceBefore - currentPrice) / ((priceBefore + currentPrice) / 2);
        return Math.abs(difference * 100);
      })()
    }));
    tokensDaily.forEach(item => {
      tokensStatsDaily[item.tokenId] = {
        difference: item.difference,
        increase: item.increase
      };
    });
  };

  onMount(async () => {
    if (!$store.userAddress) push("/");

    const userTokens = Object.entries($store.tokens).filter(tk =>
      $localStorageStore.favoriteTokens.includes(tk[0])
    );
    const newBalances = await searchUserTokens({
      Tezos: $store.Tezos,
      userAddress: $store.userAddress,
      tokens: userTokens
    });
    store.updateTokensBalances(newBalances as State["tokensBalances"]);

    // fetches XTZ balance
    const balance = await $store.Tezos.tz.getBalance($store.userAddress);
    if (balance) {
      store.updateTezBalance(balance.toNumber());
    }

    await fetchTokensStats();
    tokensStatsRefresh = setInterval(fetchTokensStats, 10 * 60000);
  });

  afterUpdate(async () => {
    if (
      $store.tokensBalances &&
      Object.values($store.tokensBalances).length > 0
    ) {
      /*totalHoldingInXtz = [
        0,
        0,
        ...Object.entries($store.tokensBalances).map(
          ([tokenSymbol, balance]) =>
            balance * $store.tokens[tokenSymbol].exchangeRate
        )
      ].reduce((a, b) => a + b);*/
      totalHoldingInXtz = [
        0,
        0,
        ...$localStorageStore.favoriteTokens.map(tk => {
          if ($store.tokens[tk] && $store.tokensBalances[tk]) {
            return $store.tokensBalances[tk] * $store.tokens[tk].exchangeRate;
          } else {
            return 0;
          }
        })
      ].reduce((a, b) => a + b);
      // adds XTZ balance
      if ($store.xtzData.balance) {
        totalHoldingInXtz += $store.xtzData.balance / 10 ** 6;
      }
    }
  });

  onDestroy(() => {
    clearInterval(tokensStatsRefresh);
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    .user-tokens-stats {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 1.4rem;
      padding: 10px;
      text-align: center;
    }

    #select-user-token {
      width: 100%;
      position: relative;
      height: 60px;

      button {
        margin: 0 auto;
      }

      .select-tokens {
        z-index: 100;
        width: 70%;
        min-height: 200px;
        border: none;
        border-radius: 10px;
        position: absolute;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-wrap: wrap;
        box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
        background-color: white;

        .token-to-select {
          padding: 5px;
          margin: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 0.9rem;
          cursor: pointer;
          transition: 0.3s;
          border: solid 2px transparent;
          border-radius: 10px;

          img {
            width: 20px;
            height: 20px;
          }

          &:hover {
            background-color: lighten($container-bg-color, 60);
          }

          &.favorite {
            border-color: lighten($container-bg-color, 60);
          }
        }
      }
    }

    .favorite-tokens {
      display: flex;
      justify-content: center;
      align-items: stretch;
      flex-wrap: wrap;
      gap: 30px;

      .favorite-token {
        /*display: flex;
        justify-content: space-between;
        align-items: center;*/
        display: grid;
        row-gap: 10px;
        width: 250px;
        border: solid 1px $bg-color;
        border-radius: 10px;
        padding: 1rem 10px;
        position: relative;
        z-index: 10;

        img {
          height: 2.4rem;
          position: absolute;
          top: -1.4rem;
          left: 10px;
          background-color: white;
          padding: 0px 3px;
        }

        .favorite-token__price {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .favorite-token__stats {
          border-top: solid 1px $bg-color;
          padding: 10px 10px 0px 10px;
          font-size: 0.8rem;
        }
      }
    }
  }
</style>

<section>
  <div class="user-tokens-stats">
    <div class="total-value">
      <div>Total value of tokens</div>
      <div>ꜩ {totalHoldingInXtz ? +totalHoldingInXtz.toFixed(3) / 1 : 0}</div>
      <div>
        {(totalHoldingInXtz
          ? +(totalHoldingInXtz * $store.xtzData.exchangeRate).toFixed(2) / 1
          : 0
        ).toLocaleString("en-US")}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
  </div>
  <br />
  <div id="select-user-token">
    <button
      class="primary"
      on:click={() => (showSelectTokens = !showSelectTokens)}
    >
      Add or remove a token
      <span class="material-icons"> arrow_drop_down </span>
    </button>
    {#if showSelectTokens}
      <div class="select-tokens" transition:slide={{ duration: 200 }}>
        {#each Object.entries($store.tokens).sort((a, b) => a[0]
            .toLowerCase()
            .localeCompare(b[0].toLowerCase())) as [tokenSymbol, tokenData]}
          <div
            class="token-to-select"
            class:favorite={$localStorageStore.favoriteTokens.includes(
              tokenSymbol
            )}
            on:click={() => {
              if ($localStorageStore.favoriteTokens.includes(tokenSymbol)) {
                removeFavoriteToken(tokenSymbol);
              } else {
                addFavoriteToken(tokenSymbol);
              }
            }}
          >
            <img
              src={`images/${tokenSymbol}.png`}
              alt={`${tokenSymbol}-logo`}
            />
            &nbsp; {tokenSymbol}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <br />
  <br />
  <div class="favorite-tokens">
    {#if $store.xtzData.balance}
      <div class="favorite-token">
        <img src="images/XTZ.png" alt="XTZ-logo" />
        <div>XTZ</div>
        <div>
          <div>{formatTokenAmount($store.xtzData.balance / 10 ** 6)}</div>
          <div>
            {+(
              ($store.xtzData.balance / 10 ** 6) *
              $store.xtzData.exchangeRate
            ).toFixed(2) / 1}
            {$localStorageStore.preferredFiat}
          </div>
        </div>
      </div>
    {/if}

    {#each $store.tokensBalances ? sortTokensByBalance($localStorageStore.favoriteTokens.map( tk => [tk, $store.tokensBalances[tk]] )).map(tk => tk[0]) : [] as token (token)}
      <div class="favorite-token">
        <img src={`images/${token}.png`} alt={`${token}-logo`} />
        <div class="favorite-token__price">
          <div>
            <div>{token}</div>
            <div style="font-size:0.8rem">
              {formatTokenAmount($store.tokens[token].exchangeRate)} ꜩ
            </div>
          </div>
          <div>
            {#if $store.tokensBalances && !isNaN($store.tokensBalances[token]) && $store.xtzData.exchangeRate}
              <div>
                {#if formatTokenAmount($store.tokensBalances[token]) === 0}
                  No token
                {:else}
                  {formatTokenAmount($store.tokensBalances[token])}
                {/if}
              </div>
              {#if $store.tokensBalances && formatTokenAmount($store.tokensBalances[token]) === 0}
                <div />
                <div />
                <div />
              {:else}
                <div>
                  {+(
                    $store.tokensBalances[token] *
                    $store.tokens[token].exchangeRate
                  ).toFixed(3) / 1} ꜩ
                </div>
                {#if $localStorageStore}
                  <div>
                    {+(
                      $store.tokensBalances[token] *
                      $store.tokens[token].exchangeRate *
                      $store.xtzData.exchangeRate
                    ).toFixed(3) / 1}
                    {$localStorageStore.preferredFiat}
                  </div>
                {:else}
                  <div>
                    {+(
                      $store.tokensBalances[token] *
                      $store.tokens[token].exchangeRate *
                      $store.xtzData.exchangeRate
                    ).toFixed(3) / 1} USD
                  </div>
                {/if}
              {/if}
            {:else}
              <div>---</div>
              <div>---</div>
            {/if}
          </div>
        </div>
        {#if tokensStatsWeekly.hasOwnProperty(token) || tokensStatsDaily.hasOwnProperty(token)}
          <div class="favorite-token__stats">
            {#if tokensStatsDaily.hasOwnProperty(token)}
              <div>
                Price change (24 h):
                <span
                  style={`color:${
                    tokensStatsDaily[token].increase ? "green" : "red"
                  }`}
                >
                  {tokensStatsDaily[token].increase
                    ? "+"
                    : "-"}{tokensStatsDaily[token].difference.toFixed(2)}%
                </span>
              </div>
            {/if}
            {#if tokensStatsWeekly.hasOwnProperty(token)}
              <div>
                Price change (7 d):
                <span
                  style={`color:${
                    tokensStatsWeekly[token].increase ? "green" : "red"
                  }`}
                >
                  {tokensStatsWeekly[token].increase
                    ? "+"
                    : "-"}{tokensStatsWeekly[token].difference.toFixed(2)}%
                </span>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {:else}
      No favorite token yet
    {/each}
  </div>
</section>
