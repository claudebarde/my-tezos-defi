<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { shortenHash, formatTokenAmount } from "../../../utils";

  export let address;

  let lockedAmount: number | null = null;
  let uusdOutstanding: number | null = null;

  onMount(async () => {
    // fetches data about vault
    const contract = await $store.Tezos.wallet.at(
      "KT1FFE2LC5JpVakVjHm5mM36QVp2p3ZzH4hH"
    );
    const storage: any = await contract.storage();
    const vaultContext = await storage.vault_contexts.get($store.userAddress);
    if (vaultContext) {
      lockedAmount = vaultContext.balance.toNumber() / 10 ** 6;
      uusdOutstanding = vaultContext.minted.toNumber();
    }
  });
</script>

<div class="vault-row has-sub-row">
  <div class="icon">
    <img src="images/uUSD.png" alt="token-icon" />
  </div>
  <div>
    <a
      href={`https://better-call.dev/mainnet/${address}/operations`}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {shortenHash(address)}
    </a>
  </div>
  <div>
    {#if lockedAmount || lockedAmount === 0}
      <span>
        {lockedAmount} ꜩ
      </span>
      <span style="font-size:0.8rem">
        ({formatTokenAmount(lockedAmount * $store.xtzData.exchangeRate, 2)}
        {$localStorageStore.preferredFiat})
      </span>
    {:else}
      <span class="material-icons"> hourglass_empty </span>
    {/if}
  </div>
  <div />
  <div>
    <button
      class="mini"
      on:click={() => localStorageStore.removeVault("uusd", address)}
    >
      <span class="material-icons"> delete </span>
    </button>
  </div>
</div>
<div class="vault-sub-row">
  <div />
  <div class="stats">
    <div class="stats__stat-block">
      <div>Minted uUSD</div>
      <div>
        {uusdOutstanding
          ? formatTokenAmount(
              uusdOutstanding / 10 ** $store.tokens.uUSD.decimals
            )
          : "---"} uUSD
      </div>
    </div>
  </div>
  <div />
  <div />
</div>
