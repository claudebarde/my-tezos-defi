<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import store from "../../../store";
  import type { AvailableInvestment } from "../../../types";
  import FarmRow from "./FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";

  let farms: Array<{ id: AvailableInvestment; balance: number }> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];

  onMount(async () => {
    if ($store.userAddress) {
      const wrapFarmsAddresses = Object.values($store.investments).filter(
        inv => inv.platform === "wrap"
      );
      const farmsData = await Promise.all(
        wrapFarmsAddresses.map(farm => {
          let url;
          if (farm.type === "staking" || farm.type === "stacking") {
            url = `https://api.tzkt.io/v1/contracts/${farm.address}/bigmaps/delegators/keys/${$store.userAddress}`;
          } else if (farm.type === "fee-farming") {
            url = `https://api.tzkt.io/v1/contracts/${farm.address}/bigmaps/balances/keys/${$store.userAddress}`;
          }

          if (url) {
            return fetch(url)
              .then(res => res.json())
              .then(res => ({
                address: farm.address,
                invType: farm.type,
                ...res
              }))
              .catch(err => JSON.stringify(err));
          } else {
            return "{}";
          }
        })
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => typeof data !== "string")
          .filter(data => {
            if (data.invType === "stacking") {
              return data.active && +data.value.balance > 0;
            } else if (data.invType === "staking") {
              return data.active && +data.value.lpTokenBalance > 0;
            } else if (data.invType === "fee-farming") {
              return data.active && +data.value > 0;
            } else {
              return undefined;
            }
          })
          .filter(el => el)
          .map(data => {
            if (data.invType === "stacking") {
              return {
                id: Object.values($store.investments).find(
                  inv => inv.address === data.address
                ).id,
                balance: +data.value.balance
              };
            } else if (data.invType === "staking") {
              return {
                id: Object.values($store.investments).find(
                  inv => inv.address === data.address
                ).id,
                balance: +data.value.lpTokenBalance
              };
            } else if (data.invType === "fee-farming") {
              return {
                id: Object.values($store.investments).find(
                  inv => inv.address === data.address
                ).id,
                balance: +data.value
              };
            }
          });
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
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="Wrap"
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
    />
  {/each}
{/if}
