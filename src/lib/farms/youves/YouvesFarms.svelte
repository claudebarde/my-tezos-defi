<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment, Farm } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";
  import { sortFarmsPerRewards } from "../../../utils";

  let farms: Array<Farm> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];
  let harvestingAll = false;

  const harvestAll = async () => {
    console.log("harvest all youves");
  };

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
      // the YOU staking farm has a different pattern
      const youStakingEntryRes = await fetch(
        `https://api.tzkt.io/v1/contracts/${$store.investments["YOUVES-YOU-STAKING"].address}/bigmaps/stakes_owner_lookup/keys/${$store.userAddress}`
      );
      if (youStakingEntryRes && youStakingEntryRes.status === 200) {
        const youStakingEntry = await youStakingEntryRes.json();
        if (
          youStakingEntry &&
          youStakingEntry.active === true &&
          Array.isArray(youStakingEntry.value) &&
          !isNaN(youStakingEntry.value[0])
        ) {
          const stakeEntryRes = await fetch(
            `https://api.tzkt.io/v1/contracts/${$store.investments["YOUVES-YOU-STAKING"].address}/bigmaps/stakes/keys/${youStakingEntry.value[0]}`
          );
          if (stakeEntryRes && stakeEntryRes.status === 200) {
            const stakeEntry = await stakeEntryRes.json();
            if (stakeEntry && stakeEntry.active === true) {
              const { stake, token_amount } = stakeEntry.value;
              if (!isNaN(token_amount)) {
                if (farmsData) {
                  farmsData.push({
                    address: $store.investments["YOUVES-YOU-STAKING"].address,
                    active: true,
                    value: { stake: token_amount },
                    type: "long-term"
                  });
                }
              }
            }
          }
        }
      }

      if (farmsData.length > 0) {
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
            address: data.address,
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

{#if $store.userAddress && farms.length > 0}
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="Youves"
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
