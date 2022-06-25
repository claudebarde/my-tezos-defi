<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment, Farm } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";
  import { sortFarmsPerRewards } from "../../../utils";
  import config from "../../../config";

  let farms: Array<Farm> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];
  let harvestingAll = false;

  const harvestAll = async () => {
    console.log("harvest all smartlink");
  };

  onMount(async () => {
    if ($store.userAddress) {
      const matterContractAddress = "KT1K4jn23GonEmZot3pMGth7unnzZ6EaMVjY";
      const accountsInternalKey = 55646;
      const res = await fetch(
        `https://api.tzkt.io/v1/bigmaps/${accountsInternalKey}/keys?active=true&key.user_address=${$store.userAddress}`
      );
      if (res && res.status === 200) {
        const data = await res.json();
        farms = data.map(entry => {
          const lptAddress = entry.key.token.fa2_address;
          if (lptAddress && config.matterFarms.hasOwnProperty(lptAddress)) {
            return {
              id: config.matterFarms[lptAddress],
              balance: !isNaN(+entry.value.staked) ? +entry.value.staked : 0,
              address: matterContractAddress
            };
          }
        });
        if (farms.length > 0) {
          // updates investment balance
          store.updateInvestments(
            farms.map(farm => [
              farm.id,
              { ...$store.investments[farm.id], balance: farm.balance }
            ])
          );
          // updates local storage
          $store.localStorage.addFarms(farms.map(farm => farm.id));
        }
      }
    }
  });
</script>

{#if $store.userAddress && farms.length > 0}
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="Matter"
    {harvestingAll}
    on:harvest-all={harvestAll}
  />
  {#each farms.sort( (a, b) => sortFarmsPerRewards(a, b, totalRewards) ) as farm, index (farm.id)}
    <FarmRow
      invName={farm.id}
      pos={index}
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
