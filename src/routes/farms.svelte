<script lang="ts">
  import store from "../store";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import PlentyFarms from "$lib/farms/plenty/PlentyFarms.svelte";
  import PaulFarms from "$lib/farms/paul/PaulFarms.svelte";
  import KdaoFarms from "$lib/farms/kdao/KdaoFarms.svelte";
  import WrapFarms from "$lib/farms/wrap/WrapFarms.svelte";
  import YouvesFarms from "$lib/farms/youves/YouvesFarms.svelte";
  import SmartlinkFarms from "$lib/farms/smartlink/SmartlinkFarms.svelte";
  import type { AvailableInvestment } from "../types";

  let totalFarms:
    | Array<{
        id: AvailableInvestment;
        balance: number;
        value: number;
        rewards: number;
      }>
    | undefined = undefined;
</script>

<style lang="scss">
  .farms {
    width: 90%;
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader farms={totalFarms} />
    <div class="farms">
      <PlentyFarms
        on:farm-update={event => {
          const val = event.detail;
          if (totalFarms === undefined) {
            totalFarms = [val];
          } else {
            // filters existing values in array
            const farms = totalFarms.filter(farm => farm.id !== val.id);
            totalFarms = [...farms, val];
          }
        }}
      />
      <KdaoFarms
        on:farm-update={event => {
          const val = event.detail;
          if (totalFarms === undefined) {
            totalFarms = [val];
          } else {
            // filters existing values in array
            const farms = totalFarms.filter(farm => farm.id !== val.id);
            totalFarms = [...farms, val];
          }
        }}
      />
      <YouvesFarms
        on:farm-update={event => {
          const val = event.detail;
          if (totalFarms === undefined) {
            totalFarms = [val];
          } else {
            // filters existing values in array
            const farms = totalFarms.filter(farm => farm.id !== val.id);
            totalFarms = [...farms, val];
          }
        }}
      />
      <PaulFarms
        on:farm-update={event => {
          const val = event.detail;
          if (totalFarms === undefined) {
            totalFarms = [val];
          } else {
            // filters existing values in array
            const farms = totalFarms.filter(farm => farm.id !== val.id);
            totalFarms = [...farms, val];
          }
        }}
      />
      <SmartlinkFarms
        on:farm-update={event => {
          const val = event.detail;
          if (totalFarms === undefined) {
            totalFarms = [val];
          } else {
            // filters existing values in array
            const farms = totalFarms.filter(farm => farm.id !== val.id);
            totalFarms = [...farms, val];
          }
        }}
      />
      <WrapFarms
        on:farm-update={event => {
          const val = event.detail;
          if (totalFarms === undefined) {
            totalFarms = [val];
          } else {
            // filters existing values in array
            const farms = totalFarms.filter(farm => farm.id !== val.id);
            totalFarms = [...farms, val];
          }
        }}
      />
    </div>
  {:else}
    <div>No user connected</div>
  {/if}
</div>
