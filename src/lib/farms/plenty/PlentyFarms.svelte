<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import store from "../../../store";
  import toastStore from "../../../toastStore";
  import type { AvailableInvestment, Farm } from "../../../types";
  import { AvailableToken, ToastType } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";
  import FarmWorker from "../farms.worker?worker";
  import { prepareOperation, sortFarmsPerRewards } from "../../../utils";

  let farms: Array<Farm> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];
  let farmsWorker;
  let harvestingAll = false;
  let harvestingAllSuccess = undefined;

  const harvestAll = async () => {
    harvestingAll = true;
    try {
      // gets the addresses of pools with rewards to harvest
      let allRewards = [0, 0, ...totalRewards.map(rw => rw.rewards)].reduce(
        (a, b) => a + b
      );
      const contractCalls = await Promise.all(
        farms.map(async res => {
          const contract = await $store.Tezos.wallet.at(res.address);
          return contract.methods.GetReward([["unit"]]);
        })
      );
      const fee = $store.serviceFee
        ? allRewards * $store.xtzExchangeRate * $store.serviceFee
        : null;
      // batches transactions
      const batch = prepareOperation({
        contractCalls: contractCalls,
        amount: fee,
        tokenSymbol: AvailableToken.PLENTY
      });
      const op = await batch.send();
      await op.confirmation();
      const receipt = await op.receipt();
      harvestingAll = false;
      if (!receipt) {
        harvestingAllSuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingAllSuccess = true;
        setTimeout(() => {
          harvestingAllSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
    } finally {
      harvestingAll = false;
    }
  };

  onMount(async () => {
    if ($store.userAddress) {
      // spins up the dedicated web worker
      farmsWorker = new FarmWorker();
      farmsWorker.postMessage({
        type: "init"
      });
      // fetches farms data
      const plentyFarmsAddresses = Object.values($store.investments)
        .filter(inv => inv.platform === "plenty")
        .map(inv => inv.address);
      const farmsData = await Promise.all(
        plentyFarmsAddresses.map(addr =>
          fetch(
            `https://api.tzkt.io/v1/contracts/${addr}/bigmaps/balances/keys/${$store.userAddress}`
          )
            .then(res => res.json())
            .then(res => ({ address: addr, ...res }))
            .catch(err => JSON.stringify(err))
        )
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => typeof data !== "string")
          .filter(
            data => data.active && (+data.value.balance > 0 || +data.value > 0)
          )
          .map(data => ({
            id: Object.values($store.investments).find(
              inv => inv.address === data.address
            ).id,
            address: data.address,
            balance: data.value.balance ? +data.value.balance : +data.value
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
        toastStore.addToast({
          type: ToastType.ERROR,
          message: "Error while fetching Plenty farms",
          dismissable: true
        });
      }
    }
  });
</script>

{#if $store.userAddress && farms.length > 0}
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="Plenty"
    {harvestingAll}
    on:harvest-all={harvestAll}
  />
  <div class="farms-group">
    {#each farms.sort( (a, b) => sortFarmsPerRewards(a, b, totalRewards) ) as farm, index (farm.id)}
      <FarmRow
        invName={farm.id}
        {farmsWorker}
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
  </div>
{/if}
