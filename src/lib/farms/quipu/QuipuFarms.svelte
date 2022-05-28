<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment, Farm } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";
  import config from "../../../config";
  import { sortFarmsPerRewards } from "../../../utils";

  let farms: Array<Farm> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];
  let harvestingAll = false;

  const harvestAll = async () => {
    console.log("harvest all quipu");
  };

  onMount(async () => {
    if ($store.userAddress) {
      const farmsUrls = [...Array(7).keys()].map(
        index =>
          `https://api.tzkt.io/v1/contracts/${config.quipuFarmsContract}/bigmaps/users_info/keys/{"nat":"${index}","address":"${$store.userAddress}"}`
      );
      const farmsData = await Promise.all(
        farmsUrls.map((url, index) =>
          fetch(url)
            .then(res => res.json())
            .then(res => ({
              index,
              address: config.quipuFarmsContract,
              ...res
            }))
            .catch(err => JSON.stringify(err))
        )
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => typeof data !== "string")
          .filter(data => data.active && +data.value.staked > 0)
          .map(data => ({
            //HACK: maybe find a more elegant way for the id
            id: `QUIPU-FARM-${data.index}` as AvailableInvestment,
            address: data.address,
            balance: +data.value.staked
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
    name="QuipuSwap"
    {harvestingAll}
    on:harvest-all={harvestAll}
  />
  {#each farms.sort((a, b) => sortFarmsPerRewards(a, b, totalRewards)) as farm}
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
