<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../store";
  import type { Operation } from "../types";
  import { createNewOpEntry } from "../utils";
  import LastOperations from "../lib/LastOperations/LastOperations.svelte";

  let lastTransactions: Operation[] = [];

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
        const targetLastTxsResponse = await fetch(
          `https://api.mainnet.tzkt.io/v1/operations/transactions?target=${
            $store.userAddress
          }&sender.in=${addresses.join(",")}&level.ge=${
            currentLevel - 60 * 24 * 3
          }&sort.desc=id`
        );
        if (targetLastTxsResponse) {
          const targetLastTxs = await targetLastTxsResponse.json();
          unprocessedTxs = [...unprocessedTxs, ...targetLastTxs];
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
