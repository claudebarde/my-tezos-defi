<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";

  let farms: Array<{ id: AvailableInvestment; balance: number }> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];
  let harvestingAll = false;

  const harvestAll = async () => {
    console.log("harvest all smartlink");
  };

  onMount(async () => {
    if ($store.userAddress) {
      const farmsAddresses = Object.values($store.investments)
        .filter(inv => inv.platform === "smartlink")
        .map(inv => inv.address);
      const farmsData = await Promise.all(
        farmsAddresses.map(addr =>
          fetch(
            `https://api.tzkt.io/v1/contracts/${addr}/bigmaps/user_stakes/keys/${$store.userAddress}`
          )
            .then(res => res.json())
            .then(res => ({ address: addr, ...res }))
            .catch(err => JSON.stringify(err))
        )
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => typeof data !== "string")
          .filter(data => data.active && +data.value > 0)
          .map(data => ({
            id: Object.values($store.investments).find(
              inv => inv.address === data.address
            ).id,
            balance: +data.value
          }));
        // updates investment balance
        store.updateInvestments(
          farms.map(farm => [
            farm.id,
            { ...$store.investments[farm.id], balance: farm.balance }
          ])
        );
        // updates local storage
        $store.localStorage.addFarms(farms.map(farm => farm.id));
      } else {
        // TODO: display a toast with the error
        console.error("Error while fetching Plenty farms");
      }
    }
  });
</script>

{#if $store.userAddress && farms.length > 0}
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="Smartlink"
    {harvestingAll}
    on:harvest-all={harvestAll}
  />
  {#each farms as farm}
    <FarmRow
      invName={farm.id}
      on:farm-update={event => {
        const val = event.detail;
        const farms = totalRewards.filter(farm => farm.id !== val.id);
        totalRewards = [...farms, val];
        dispatch("farm-update", val);
      }}
      on:roi-per-week={event => dispatch("roi-per-week", event.detail)}
    />
  {/each}
{/if}
