<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../store";
  import localStorageStore from "../localStorage";
  import type { Operation } from "../types";
  import { createNewOpEntry, searchUserTokens } from "../utils";
  import LastOperations from "../lib/LastOperations/LastOperations.svelte";
  import PoolSelection from "../lib/Investments/PoolSelection.svelte";

  let lastTransactions: Operation[] = [];
  let daysInThePast = 7;

  const addFavoriteToken = async tokenSymbol => {
    // adds token to favorite list
    localStorageStore.addFavoriteToken(tokenSymbol);
    // gets user's balance
    const userToken = await searchUserTokens({
      Tezos: $store.Tezos,
      network: $store.network,
      userAddress: $store.userAddress,
      tokens: Object.entries($store.tokens).filter(tk =>
        $localStorageStore.favoriteTokens.includes(tk[0])
      ),
      tokensBalances: $store.tokensBalances
    });
    if (userToken) {
      store.updateTokensBalances({
        ...$store.tokensBalances,
        [tokenSymbol]: userToken[tokenSymbol]
      });
    }
  };

  const removeFavoriteToken = async tokenSymbol => {
    // removes token from favorite list
    localStorageStore.removeFavoriteToken(tokenSymbol);
  };

  afterUpdate(async () => {
    if (lastTransactions.length === 0 && $store.userAddress) {
      let addresses = [];
      if ($store.tokens) {
        addresses = [
          ...addresses,
          ...Object.values($store.tokens).map(token => token.address)
        ];
      }
      if ($store.investments) {
        [
          ...addresses,
          ...Object.values($store.investments).map(entry => entry.address)
        ];
      }

      let unprocessedTxs = [];
      const headResponse = await fetch("https://api.mainnet.tzkt.io/v1/head");
      if (headResponse && addresses.length > 0) {
        const head = await headResponse.json();
        const currentLevel = head.level;
        // fetches transactions where user was the sender
        const senderLastTxsResponse = await fetch(
          `https://api.mainnet.tzkt.io/v1/operations/transactions?sender=${
            $store.userAddress
          }&target.in=${addresses.join(",")}&level.ge=${
            currentLevel - 60 * 24 * 3
          }&sort.desc=id`
        );
        if (senderLastTxsResponse) {
          const senderLastTxs = await senderLastTxsResponse.json();
          unprocessedTxs = [...senderLastTxs];
        }
        // fetches transactions where user was the target
        const targetLastTxsResponse = await fetch(
          `https://api.mainnet.tzkt.io/v1/operations/transactions?target=${
            $store.userAddress
          }&sender.in=${addresses.join(",")}&level.ge=${
            currentLevel - 60 * 24 * daysInThePast
          }&sort.desc=id`
        );
        if (targetLastTxsResponse) {
          const targetLastTxs = await targetLastTxsResponse.json();
          unprocessedTxs = [...unprocessedTxs, ...targetLastTxs];
        }
        // fetches transactions of fa1.2 tokens
        const fa12TransactionsResponse = await fetch(
          `https://api.mainnet.tzkt.io/v1/operations/transactions?target.in=${addresses.join(
            ","
          )}&entrypoint=transfer&parameter.in=[{"from":"${
            $store.userAddress
          }"},{"to":"${$store.userAddress}"}]&level.ge=${
            currentLevel - 60 * 24 * daysInThePast
          }&limit=200`
        );
        if (fa12TransactionsResponse) {
          const fa12Transactions = await fa12TransactionsResponse.json();
          unprocessedTxs = [...unprocessedTxs, ...fa12Transactions];
        }
        // fetches transactions of fa2 tokens
        const url = `https://api.mainnet.tzkt.io/v1/operations/transactions?target.in=${addresses.join(
          ","
        )}&parameter.[*].txs.[*].to_=${$store.userAddress}&level.ge=${
          currentLevel - 60 * 24 * daysInThePast
        }&limit=200`;
        const fa2TransactionsResponse = await fetch(url);
        if (fa2TransactionsResponse) {
          const fa2Transactions = await fa2TransactionsResponse.json();
          unprocessedTxs = [...unprocessedTxs, ...fa2Transactions];
        }
        // fetches distribution from WRAP protocol
        const wrapDistributeUrl = `https://api.mainnet.tzkt.io/v1/operations/transactions?target=KT1LRboPna9yQY9BrjtQYDS1DVxhKESK4VVd&parameter.[*].to_=tz1Me1MGhK7taay748h4gPnX2cXvbgL6xsYL&level.ge=${
          currentLevel - 60 * 24 * daysInThePast
        }&limit=200`;
        const wrapDistributeResponse = await fetch(wrapDistributeUrl);
        if (wrapDistributeResponse) {
          const wrapDistribute = await wrapDistributeResponse.json();
          wrapDistribute.forEach(tx => {
            if (
              tx?.parameter?.entrypoint &&
              tx.parameter.entrypoint === "distribute"
            ) {
              tx.parameter.value.forEach(val => {
                if (val.to_ === $store.userAddress) {
                  unprocessedTxs = [...unprocessedTxs, tx];
                }
              });
            }
          });
        }

        unprocessedTxs.sort((a, b) => b.id - a.id);

        lastTransactions = [
          ...unprocessedTxs.map(tx => createNewOpEntry(tx, $store.tokens))
        ];
      }
    }
  });
</script>

<style lang="scss">
  .material-icons {
    vertical-align: bottom;
  }

  a {
    text-decoration: none;
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  h2 {
    text-align: center;
  }

  .container-favorite {
    padding: 10px 0px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;

    .box {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 5px;
      margin: 5px;
      min-width: 100px;

      .icon {
        position: relative;
        padding: 10px;
        margin: 5px;
        width: 20px;
        height: 20px;
        cursor: pointer;

        &:hover img {
          width: 44px;
          height: 44px;
          top: calc(50% - 22px);
          left: calc(50% - 22px);
        }

        img {
          position: absolute;
          top: calc(50% - 15px);
          left: calc(50% - 15px);
          width: 30px;
          height: 30px;
          vertical-align: middle;
          transition: 0.3s;
        }

        .favorite-mark {
          display: block;
          position: absolute;
          top: -5px;
          left: -5px;
          width: 100%;
          height: 100%;
          border: solid 5px transparent;
          border-radius: 50%;
        }

        &.favorite {
          .favorite-mark {
            border-color: #059669;
          }
        }
      }
    }
  }

  .container-investments {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: auto;
    justify-items: center;
    padding: 10px;
  }
</style>

<div>
  <a href="/#/">
    <span class="material-icons"> arrow_back </span> Back
  </a>
</div>
<h2>Your profile</h2>
<br /><br />
<div class="container">
  <div class="title">Available tokens</div>
  <div class="container-favorite">
    {#if $store.tokens}
      {#each Object.keys($store.tokens).sort((a, b) => a
          .toLowerCase()
          .localeCompare(b.toLowerCase())) as tokenSymbol}
        <div class="box">
          <div
            class="icon"
            class:favorite={$localStorageStore.favoriteTokens.includes(
              tokenSymbol
            )}
            on:click={async () => {
              if ($localStorageStore.favoriteTokens.includes(tokenSymbol)) {
                await removeFavoriteToken(tokenSymbol);
              } else {
                await addFavoriteToken(tokenSymbol);
              }
            }}
          >
            <div class="favorite-mark" />
            <img
              src={`images/${tokenSymbol === "tez" ? "XTZ" : tokenSymbol}.png`}
              alt={tokenSymbol}
            />
          </div>
          <div>{tokenSymbol}</div>
        </div>
      {/each}
    {:else}
      <div>Loading...</div>
    {/if}
  </div>
</div>
<br /><br />
<div class="container">
  <div class="title">Investments</div>
  <div class="container-investments">
    <PoolSelection platform="quipuswap" />
    <PoolSelection platform="plenty" />
    <PoolSelection platform="crunchy" />
    <PoolSelection platform="paul" />
    <PoolSelection platform="flame" />
    <PoolSelection platform="wxtz" />
  </div>
</div>
<br /><br />
<LastOperations lastOps={lastTransactions} filterOps={{ opType: "user" }} />
