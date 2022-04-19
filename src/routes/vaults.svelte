<script lang="ts">
  import { onMount } from "svelte";
  import store from "../store";
  import { type TezosContractAddress, AvailableVault } from "../types";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import VaultsHeader from "$lib/vaults/VaultsHeader.svelte";
  import WxtzVaults from "$lib/vaults/wXTZ/WxtzVaults.svelte";
  // wXTZ find user vaults
  // https://api.tzkt.io/v1/bigmaps/updates?bigmap=260&value=tz1Me1MGhK7taay748h4gPnX2cXvbgL6xsYL

  let allVaults: Array<{
    platform: AvailableVault;
    address: TezosContractAddress;
    xtzLocked: number;
  }> = [];

  onMount(async () => {
    if ($store.userAddress) {
      // wXTZ
      let wxtzVaults: Array<TezosContractAddress> = [];
      const vaultsPromises = await Promise.allSettled([
        fetch(
          `https://api.tzkt.io/v1/bigmaps/updates?bigmap=260&value=${$store.userAddress}`
        )
      ]);
      if (vaultsPromises) {
        const vaults = await Promise.allSettled(
          vaultsPromises.map(data =>
            data.status === "fulfilled" ? data.value.json() : undefined
          )
        );
        if (vaults && vaults.length > 0) {
          vaults
            .filter(vault => vault)
            .forEach(vault =>
              (vault as PromiseFulfilledResult<any>).value.forEach(vaultVal => {
                wxtzVaults = [...wxtzVaults, vaultVal.content.key];
              })
            );
        }
      }

      wxtzVaults = [...Array.from(new Set(wxtzVaults))];
      //   finds balance in the vaults

      allVaults = [
        ...wxtzVaults.map(addr => ({
          platform: AvailableVault.WXTZ,
          address: addr,
          xtzLocked: 0
        }))
      ];

      // kDAO
      // Youves
    }
  });
</script>

<style lang="scss">
  .vaults {
    width: 90%;
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader />
    <VaultsHeader vaults={allVaults} />
    <div class="vaults">
      <WxtzVaults
        vaults={allVaults.filter(
          vault => vault.platform === AvailableVault.WXTZ
        )}
        on:update-xtz-locked={event => {
          const val = event.detail;
          allVaults = [
            ...allVaults.filter(vault => vault.address !== val.address),
            {
              platform: AvailableVault.WXTZ,
              address: val.address,
              xtzLocked: val.balance / 10 ** 6
            }
          ];
        }}
      />
    </div>
  {:else}
    <div>You must connect your wallet to check your vaults</div>
  {/if}
</div>
