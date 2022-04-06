<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment } from "../../../types";
  import FarmRow from "./FarmRow.svelte";

  let farms: Array<{ id: AvailableInvestment; balance: number }> = [];
  const dispatch = createEventDispatcher();

  onMount(async () => {
    if ($store.userAddress) {
      const paulFarmsAddresses = Object.values($store.investments)
        .filter(inv => inv.platform === "paul")
        .map(inv => inv.address);
      const farmsData = await Promise.all(
        paulFarmsAddresses.map(addr =>
          fetch(
            `https://api.tzkt.io/v1/contracts/${addr}/bigmaps/account_info/keys/${$store.userAddress}`
          )
            .then(res => res.json())
            .then(res => ({ address: addr, ...res }))
            .catch(err => JSON.stringify(err))
        )
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => data.active && +data.value.amount > 0)
          .map(data => ({
            id: Object.values($store.investments).find(
              inv => inv.address === data.address
            ).id,
            balance: +data.value.amount
          }));
        // updates investment balance
        store.updateInvestments(
          farms.map(farm => [
            farm.id,
            { ...$store.investments[farm.id], balance: farm.balance }
          ])
        );
      } else {
        // TODO: display a toast with the error
        console.error("Error while fetching Plenty farms");
      }
    }
  });
</script>

{#if $store.userAddress}
  <h3>Paul farms</h3>
  {#each farms as farm}
    <FarmRow
      invName={farm.id}
      on:farm-update={event => dispatch("farm-update", event.detail)}
    />
  {/each}
{/if}
