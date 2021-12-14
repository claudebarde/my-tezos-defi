<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { shortenHash, formatTokenAmount } from "../../../utils";

  export let address;

  let lockedAmount: number | null = null;
  let iconPath;

  let ctezOutstanding: number | null = null;
  let ctezCollatUtilization: number | null = null;
  let ctezLastUpdate = 0;

  onMount(async () => {
    const getBalance = await $store.Tezos.tz.getBalance(address);
    if (getBalance) {
      lockedAmount = getBalance.toNumber() / 10 ** 6;
    } else {
      lockedAmount = 0;
    }
  });

  afterUpdate(async () => {
    if (ctezLastUpdate < Date.now() - 10 * 60000) {
      ctezLastUpdate = Date.now();
      // finds minted Ctez
      if ($store.Tezos && $store.tokens && $store.tokens.Ctez) {
        // gets vault id
        const vault = await $store.Tezos.wallet.at(address);
        const vaultStorage: any = await vault.storage();
        const vaultId = vaultStorage.handle.id.toNumber();
        // finds Ctez balance
        const contract = await $store.Tezos.wallet.at(
          "KT1GWnsoFZVHGh7roXEER3qeCcgJgrXT3de2"
        );
        const storage: any = await contract.storage();
        const balance = await storage.ovens.get({
          id: vaultId,
          owner: $store.userAddress
        });
        if (balance.ctez_outstanding) {
          ctezOutstanding = balance.ctez_outstanding.toNumber();
          ctezCollatUtilization = +(
            (ctezOutstanding / balance.tez_balance.toNumber()) *
            100
          ).toFixed(2);
        } else {
          ctezOutstanding = 0;
        }
      }
    }
  });
</script>

<div class="vault-row">
  <div class="icon">
    <img src="images/Ctez.png" alt="token-icon" />
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
      on:click={() => localStorageStore.removeVault("ctez", address)}
    >
      <span class="material-icons"> delete </span>
    </button>
  </div>
</div>
<div class="vault-sub-row">
  <div />
  <div class="stats">
    <div>
      Minted Ctez: {ctezOutstanding
        ? formatTokenAmount(ctezOutstanding / 10 ** 6)
        : "---"} Ctez
    </div>
    <div>Collateral utilization: {ctezCollatUtilization ?? "---"}%</div>
    <div>
      {#if ctezCollatUtilization && ctezCollatUtilization < 80}
        <span class="material-icons"> sentiment_satisfied_alt </span>
      {:else if ctezCollatUtilization && ctezCollatUtilization >= 80 && ctezCollatUtilization <= 90}
        <span class="material-icons"> sentiment_neutral </span>
      {:else if ctezCollatUtilization && ctezCollatUtilization > 90}
        <span class="material-icons"> sentiment_dissatisfied </span>
      {/if}
    </div>
  </div>
</div>
