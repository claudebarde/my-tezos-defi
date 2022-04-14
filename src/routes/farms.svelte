<script lang="ts">
  import store from "../store";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import PlentyFarms from "$lib/farms/plenty/PlentyFarms.svelte";
  import PaulFarms from "$lib/farms/paul/PaulFarms.svelte";
  import KdaoFarms from "$lib/farms/kdao/KdaoFarms.svelte";
  import WrapFarms from "$lib/farms/wrap/WrapFarms.svelte";
  import YouvesFarms from "$lib/farms/youves/YouvesFarms.svelte";
  import SmartlinkFarms from "$lib/farms/smartlink/SmartlinkFarms.svelte";
  import QuipuFarms from "$lib/farms/quipu/QuipuFarms.svelte";
  import FarmsHeader from "$lib/farms/FarmsHeader.svelte";
  import type { AvailableInvestment } from "../types";

  let totalFarms:
    | Array<{
        id: AvailableInvestment;
        balance: number;
        value: number;
        rewards: number;
        roiPerWeek: number;
      }>
    | undefined = undefined;

  const updateFarms = event => {
    const val = event.detail;
    if (totalFarms === undefined) {
      totalFarms = [val];
    } else {
      // filters existing values in array
      const farms = totalFarms.filter(farm => farm.id !== val.id);
      totalFarms = [...farms, val];
    }
  };

  const updateRoiPerWeek = event => {
    const val = event.detail;
    if (totalFarms) {
      const farms = totalFarms.map(farm => {
        if (farm.id === val.id) {
          return { ...farm, roiPerWeek: val.roi };
        } else {
          return farm;
        }
      });
      totalFarms = [...farms];
    }
  };
</script>

<style lang="scss">
  .farms {
    width: 90%;
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader />
    <FarmsHeader farms={totalFarms} />
    <div class="farms">
      <PlentyFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
      <KdaoFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
      <YouvesFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
      <PaulFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
      <QuipuFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
      <SmartlinkFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
      <WrapFarms
        on:farm-update={updateFarms}
        on:roi-per-week={updateRoiPerWeek}
      />
    </div>
  {:else}
    <div>No user connected</div>
  {/if}
</div>
