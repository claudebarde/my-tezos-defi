<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../store";
  import { type TezosContractAddress, AvailableVault } from "../types";
  import config from "../config";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import VaultsHeader from "$lib/vaults/VaultsHeader.svelte";
  import WxtzVaultRow from "$lib/vaults/wXTZ/VaultRow.svelte";
  import KdaoVaultRow from "$lib/vaults/kDAO/VaultRow.svelte";
  import YouvesVaultRow from "$lib/vaults/youves/VaultRow.svelte";
  import CtezVaultRow from "$lib/vaults/ctez/VaultRow.svelte";
  // wXTZ find user vaults
  // https://api.tzkt.io/v1/bigmaps/updates?bigmap=260&value=tz1Me1MGhK7taay748h4gPnX2cXvbgL6xsYL

  let allVaults: Array<{
    platform: AvailableVault;
    address: TezosContractAddress;
    xtzLocked: number;
    isLiquidated: boolean;
  }> = [];
  let showLiquidatedOvens = true;

  const updateXtzLocked = event => {
    const val = event.detail;
    const vault = allVaults.find(v => v.address === val.address);
    allVaults = [
      ...allVaults.filter(vault => vault.address !== val.address),
      {
        ...vault,
        xtzLocked: val.balance / 10 ** 6
      }
    ];
  };

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
          xtzLocked: 0,
          isLiquidated: false
        }))
      ];

      // kDAO
      const kdaoVaultsData = await fetch(config.kolibriOvenOwnersUrl);
      if (kdaoVaultsData) {
        const data = await kdaoVaultsData.json();
        const kdaoVaults = data.ovenData
          .filter(vault => vault.ovenOwner === $store.userAddress)
          .map(vault => vault.ovenAddress);
        if (kdaoVaults.length > 0) {
          // gets the contracts storage
          const vaultsStoragePromises = await Promise.allSettled(
            kdaoVaults.map(vault =>
              fetch(`https://api.tzkt.io/v1/contracts/${vault}/storage`)
            )
          );
          if (vaultsStoragePromises) {
            const vaultStorages = await Promise.allSettled(
              vaultsStoragePromises.map(data =>
                data.status === "fulfilled" ? data.value.json() : undefined
              )
            );
            allVaults = [
              ...allVaults,
              ...vaultStorages.map((storage, index) => ({
                platform: AvailableVault.KDAO,
                address: kdaoVaults[index],
                xtzLocked: 0,
                isLiquidated: (storage as PromiseFulfilledResult<any>).value
                  .isLiquidated
              }))
            ];
          }
        }
      }

      // Youves
      const youvesVaultsPromises = await Promise.allSettled([
        fetch(
          `https://api.tzkt.io/v1/bigmaps/updates?bigmap=7712&value=${$store.userAddress}`
        )
      ]);
      if (youvesVaultsPromises) {
        const youvesVaults = await Promise.allSettled(
          youvesVaultsPromises.map(data =>
            data.status === "fulfilled" ? data.value.json() : undefined
          )
        );
        if (youvesVaults.length > 0) {
          allVaults = [
            ...allVaults,
            ...youvesVaults
              .map(storage =>
                (storage as PromiseFulfilledResult<any>).value.map(val => ({
                  platform: AvailableVault.YOUVES,
                  address: val.content.key,
                  xtzLocked: 0,
                  isLiquidated: false
                }))
              )
              .flat()
          ];
        }
      }

      // Ctez
      const ctezVaultsPromises = await Promise.allSettled([
        fetch(
          `https://api.tzkt.io/v1/bigmaps/20919/keys?key.owner=${$store.userAddress}`
        )
      ]);
      if (ctezVaultsPromises) {
        const ctezVaults = await Promise.allSettled(
          ctezVaultsPromises.map(data =>
            data.status === "fulfilled" ? data.value.json() : undefined
          )
        );
        if (ctezVaults.length > 0) {
          allVaults = [
            ...allVaults,
            ...ctezVaults
              .map(storage =>
                (storage as PromiseFulfilledResult<any>).value.map(val => ({
                  platform: AvailableVault.CTEZ,
                  address: val.value.address,
                  xtzLocked: 0,
                  isLiquidated: false
                }))
              )
              .flat()
          ];
        }
      }
    }
  });

  afterUpdate(() => {
    allVaults = [...allVaults.sort((a, b) => b.xtzLocked - a.xtzLocked)];
  });
</script>

<style lang="scss">
  .vaults {
    width: 90%;

    h3 {
      padding: 0px;
      margin: 0px;
    }
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader />
    <VaultsHeader vaults={allVaults} />
    <div class="vaults">
      <div
        style="display:flex;justify-content:space-between;align-items:center"
      >
        <h3>Kolibri ovens</h3>
        <div>
          <label for="liquidated-ovens">
            <span>Show liquidated ovens</span>
            <input
              type="checkbox"
              id="liquidated-ovens"
              bind:checked={showLiquidatedOvens}
            />
          </label>
        </div>
      </div>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.KDAO)
        .filter( vault => (showLiquidatedOvens ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <KdaoVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div>No oven</div>
      {/each}
      <h3>Youves vaults</h3>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.YOUVES)
        .filter( vault => (showLiquidatedOvens ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <YouvesVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div>No oven</div>
      {/each}
      <h3>Ctez vaults</h3>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.CTEZ)
        .filter( vault => (showLiquidatedOvens ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <CtezVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div>No oven</div>
      {/each}
      <h3>wXTZ vaults</h3>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.WXTZ)
        .filter( vault => (showLiquidatedOvens ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <WxtzVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div>No vault</div>
      {/each}
    </div>
  {:else}
    <div>You must connect your wallet to check your vaults</div>
  {/if}
</div>
