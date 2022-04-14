<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";

  let farms: Array<{ id: AvailableInvestment; balance: number }> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];

  onMount(async () => {
    if ($store.userAddress) {
      const youvesFarmsAddresses = Object.values($store.investments).filter(
        inv => inv.platform === "youves"
      );
      const farmsData = await Promise.all(
        youvesFarmsAddresses.map(farm =>
          fetch(
            `https://api.tzkt.io/v1/contracts/${farm.address}/bigmaps/stakes/keys/${$store.userAddress}`
          )
            .then(res => res.json())
            .then(res => ({ address: farm.address, type: farm.type, ...res }))
            .catch(err => JSON.stringify(err))
        )
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => typeof data !== "string")
          .filter(data => {
            if (data.type === "long-term") {
              return data.active && +data.value.stake > 0;
            } else {
              return data.active && +data.value > 0;
            }
          })
          .map(data => ({
            id: Object.values($store.investments).find(
              inv => inv.address === data.address
            ).id,
            balance: data.type === "long-term" ? +data.value.stake : +data.value
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

{#if $store.userAddress}
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="Youves"
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
