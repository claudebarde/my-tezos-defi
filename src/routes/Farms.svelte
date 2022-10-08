<script lang="ts">
  import store from "../store";
  import Layout from "./__layout.svelte";
  import ProfileHeader from "../lib/ProfileHeader.svelte";
  import PlentyFarms from "../lib/farms/plenty/PlentyFarms.svelte";
  import KdaoFarms from "../lib/farms/kdao/KdaoFarms.svelte";
  import YouvesFarms from "../lib/farms/youves/YouvesFarms.svelte";
  import QuipuFarms from "../lib/farms/quipu/QuipuFarms.svelte";
  // import MatterFarms from "../lib/farms/matter/MatterFarms.svelte";
  import FarmsHeader from "../lib/farms/FarmsHeader.svelte";
  import type { AvailableInvestment } from "../types";
  import BarnImg from "../assets/farm-48.png";

  export let params;

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
    width: 100%;
  }

  .no-user {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 40px;
    margin-top: 40%;
  }

  @media only screen and (max-height: 700px) {
    .no-user {
      margin-top: 20%;
    }
  }
</style>

<Layout>
  <div class="container">
    {#if $store.userAddress}
      <ProfileHeader profileAddress={$store.userAddress} />
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
        <QuipuFarms
          on:farm-update={updateFarms}
          on:roi-per-week={updateRoiPerWeek}
        />
        <!-- <MatterFarms
          on:farm-update={updateFarms}
          on:roi-per-week={updateRoiPerWeek}
        /> -->
      </div>
    {:else}
      <div class="no-user">
        <img src={BarnImg} alt="barn" />
        <div>Connect your wallet to see your farms</div>
        <img src={BarnImg} alt="barn" />
      </div>
    {/if}
  </div>
</Layout>
