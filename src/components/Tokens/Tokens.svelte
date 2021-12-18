<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import { slide } from "svelte/transition";
  import { push } from "svelte-spa-router";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import {
    searchUserTokens,
    sortTokensByBalance,
    formatTokenAmount
  } from "../../utils";
  import type { State, AvailableToken, TokenContract } from "../../types";
  import TokenBox from "./TokenBox.svelte";

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
  let tokensStatsChartData:
    | {
        [p in AvailableToken]: { timestamp: string; price: number }[];
      }
    | {} = {};

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

        await fetchTokensStats([[tokenSymbol, $store.tokens[tokenSymbol]]]);
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

  const fetchTokensStats = async (userTokens: [string, TokenContract][]) => {
    // fetches tokens stats
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
    const tokensWeekly = tokensAggregateWeekly.map(stats => {
      if (!tokensStatsChartData.hasOwnProperty(stats.tokenId)) {
        // populates chart
        tokensStatsChartData[stats.tokenId] = [...stats.stats.slice(-30)].map(
          stat => ({
            timestamp: stat.periodOpen,
            price: +stat.t1priceOpen
          })
        );
      }

      return {
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
      };
    });
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

    await fetchTokensStats(userTokens);
    tokensStatsRefresh = setInterval(async () => {
      const userTokens = Object.entries($store.tokens).filter(tk =>
        $localStorageStore.favoriteTokens.includes(tk[0])
      );
      await fetchTokensStats(userTokens);
    }, 10 * 60000);
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
    }
  }
</style>

<section>
  <div class="user-tokens-stats">
    <div class="total-value">
      <div>Total value of tokens</div>
      <div>{totalHoldingInXtz ? +totalHoldingInXtz.toFixed(3) / 1 : 0} ꜩ</div>
      <div>
        {(totalHoldingInXtz
          ? +(totalHoldingInXtz * $store.xtzData.exchangeRate).toFixed(2) / 1
          : 0
        ).toLocaleString("en-US")}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
    {#if $store.tokensBalances}
      <div>
        <div>
          {Object.values($store.tokensBalances).filter(b => b && b > 0).length} tokens
          with balance
        </div>
        <div>
          Total value: {formatTokenAmount(
            [
              0,
              0,
              ...Object.entries($store.tokensBalances)
                .filter(([_, tokenBalance]) => tokenBalance && tokenBalance > 0)
                .map(
                  ([tokenId, tokenBalance]) =>
                    tokenBalance * $store.tokens[tokenId].exchangeRate
                )
            ].reduce((a, b) => a + b)
          )} ꜩ
        </div>
      </div>
    {/if}
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
      <TokenBox
        token="XTZ"
        tokensStatsWeekly={undefined}
        tokensStatsDaily={undefined}
        monthlyChartData={undefined}
      />
    {/if}
    {#each $store.tokensBalances ? sortTokensByBalance($localStorageStore.favoriteTokens.map( tk => [tk, $store.tokensBalances[tk]] )).map(tk => tk[0]) : [] as token (token)}
      <TokenBox
        {token}
        tokensStatsWeekly={tokensStatsWeekly[token]}
        tokensStatsDaily={tokensStatsDaily[token]}
        monthlyChartData={tokensStatsChartData[token]}
      />
    {:else}
      No favorite token yet
    {/each}
  </div>
  <br />
  <br />
  <!--
  {#if tokensStatsChartData.length > 0}
    <TokensPriceChange chartData={tokensStatsChartData} priceSize="small" />
    <br />
    <br />
    <TokensPriceChange chartData={tokensStatsChartData} priceSize="medium" />
    <br />
    <br />
    <TokensPriceChange chartData={tokensStatsChartData} priceSize="large" />
    <br />
    <br />
    {#if $localStorageStore.favoriteTokens.includes("wWBTC") || $localStorageStore.favoriteTokens.includes("tzBTC") || $localStorageStore.favoriteTokens.includes("BTCtz")}
      <TokensPriceChange chartData={tokensStatsChartData} priceSize="huge" />
    {/if}
  {/if}-->
</section>
