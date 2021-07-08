<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../store";
  import type { Operation } from "../types";
  import { createNewOpEntry } from "../utils";
  import LastOperations from "../lib/LastOperations/LastOperations.svelte";

  let lastTransactions: Operation[] = [];
  let daysInThePast = 7;

  afterUpdate(async () => {
    if (lastTransactions.length === 0 && $store.userAddress) {
      const addresses = [
        ...Object.values($store.tokens).map(
          token => token.address[$store.network]
        ),
        ...Object.values($store.investments).map(
          entry => entry.address[$store.network]
        )
      ];

      let unprocessedTxs = [];
      const headResponse = await fetch("https://api.mainnet.tzkt.io/v1/head");
      if (headResponse) {
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
</style>

<div>
  <a href="/#/">
    <span class="material-icons"> arrow_back </span> Back
  </a>
</div>
<h2>Your profile</h2>
<br /><br />
<LastOperations lastOps={lastTransactions} filterOps={{ opType: "user" }} />
