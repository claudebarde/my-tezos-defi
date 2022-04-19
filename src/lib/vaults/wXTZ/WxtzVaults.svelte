<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableVault, TezosContractAddress } from "../../../types";
  import VaultRow from "./VaultRow.svelte";

  const dispatch = createEventDispatcher();

  export let vaults: Array<{
    platform: AvailableVault;
    address: TezosContractAddress;
    xtzLocked: number;
  }>;
</script>

{#if $store.userAddress}
  <div>wXTZ vaults</div>
  {#each vaults as vault (vault.address)}
    <VaultRow
      {vault}
      on:update-xtz-locked={event =>
        dispatch("update-xtz-locked", event.detail)}
    />
  {/each}
{/if}
