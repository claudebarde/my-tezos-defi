<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { fly } from "svelte/transition";
  import { push } from "svelte-spa-router";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { searchUserTokens, formatTokenAmount } from "../../utils";
  import type { State } from "../../types";

  let showSelectTokens = false;
  let totalHoldingInXtz = 0;

  const addFavoriteToken = async tokenSymbol => {
    try {
      // adds token to favorite list
      localStorageStore.addFavoriteToken(tokenSymbol);
      // gets user's balance
      const userToken = await searchUserTokens({
        Tezos: $store.Tezos,
        network: $store.network,
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

  onMount(async () => {
    if (!$store.userAddress) push("/");

    const newBalances = await searchUserTokens({
      Tezos: $store.Tezos,
      network: $store.network,
      userAddress: $store.userAddress,
      tokens: Object.entries($store.tokens).filter(tk =>
        $localStorageStore.favoriteTokens.includes(tk[0])
      )
    });
    store.updateTokensBalances(newBalances as State["tokensBalances"]);

    // fetches XTZ balance
    const balance = await $store.Tezos.tz.getBalance($store.userAddress);
    if (balance) {
      store.updateTezBalance(balance.toNumber());
    }
  });

  afterUpdate(async () => {
    if (
      $store.tokensBalances &&
      Object.values($store.tokensBalances).length > 0
    ) {
      totalHoldingInXtz = [
        0,
        0,
        ...Object.entries($store.tokensBalances).map(
          ([tokenSymbol, balance]) =>
            balance * $store.tokens[tokenSymbol].exchangeRate
        )
      ].reduce((a, b) => a + b);
      // adds XTZ balance
      if ($store.xtzData.balance) {
        totalHoldingInXtz += $store.xtzData.balance / 10 ** 6;
      }
    }
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
        width: 440px;
        min-height: 200px;
        border: none;
        border-radius: 10px;
        position: absolute;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-wrap: wrap;
        box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
          rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
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
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;

      .favorite-token {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 250px;
        border: solid 1px $bg-color;
        border-radius: 10px;
        padding: 10px;
        position: relative;
        z-index: 10;

        img {
          height: 2rem;
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
      <div class="select-tokens" transition:fly={{ duration: 400, y: 100 }}>
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
            <img src={tokenData.thumbnail} alt={`${tokenSymbol}-logo`} />
            &nbsp; {tokenSymbol}
          </div>
        {/each}
      </div>
    {/if}
  </div>
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
    {#each $localStorageStore.favoriteTokens as token}
      <div class="favorite-token">
        <img src={$store.tokens[token].thumbnail} alt={`${token}-logo`} />
        <div>{token}</div>
        <div>
          {#if $store.tokensBalances && !isNaN($store.tokensBalances[token]) && $store.xtzData.exchangeRate}
            <div>
              {formatTokenAmount($store.tokensBalances[token])}
            </div>
            <div>
              ꜩ {+(
                $store.tokensBalances[token] * $store.tokens[token].exchangeRate
              ).toFixed(3) / 1}
            </div>
          {:else}
            <div>---</div>
            <div>---</div>
          {/if}
        </div>
      </div>
    {:else}
      No favorite token yet
    {/each}
  </div>
</section>