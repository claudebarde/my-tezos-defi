<script lang="ts">
  import { onMount, afterUpdate, onDestroy } from "svelte";
  import store from "../store";
  import {
    type TezosContractAddress,
    type VaultData,
    AvailableVault
  } from "../types";
  import config from "../config";
  import ProfileHeader from "../lib/ProfileHeader.svelte";
  import VaultsHeader from "../lib/vaults/VaultsHeader.svelte";
  import WxtzVaultRow from "../lib/vaults/wXTZ/VaultRow.svelte";
  import KdaoVaultRow from "../lib/vaults/kDAO/VaultRow.svelte";
  import YouvesVaultRow from "../lib/vaults/youves/VaultRow.svelte";
  import CtezVaultRow from "../lib/vaults/ctez/VaultRow.svelte";
  import pillStore from "../lib/pill/pillStore";

  let allVaults: Array<VaultData> = [];
  let vaultsUpdateInterval;

  const updateXtzLocked = event => {
    const val = event.detail;
    const vault = allVaults.find(v => v.address === val.address);
    allVaults = [
      ...allVaults.filter(vault => vault.address !== val.address),
      {
        ...vault,
        xtzLocked: val.balance
      }
    ];
  };

  const fetchWxtzVaults = async () => {
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
  };

  const fetchKdaoVaults = async () => {
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
  };

  const fetchYouvesVaults = async () => {
    const youvesVaultsWithDataPromise = await fetch(
      `https://api.tzkt.io/v1/bigmaps/7711/keys/${$store.userAddress}`
    );
    if (
      youvesVaultsWithDataPromise &&
      youvesVaultsWithDataPromise.status === 200
    ) {
      const youvesVaultsWithData = await youvesVaultsWithDataPromise.json();
      if (youvesVaultsWithData && youvesVaultsWithData.active) {
        allVaults = [
          ...allVaults,
          {
            platform: AvailableVault.YOUVES,
            address: youvesVaultsWithData.value.address,
            xtzLocked: +youvesVaultsWithData.value.balance,
            isLiquidated: youvesVaultsWithData.value.is_being_liquidated,
            borrowed: youvesVaultsWithData.value.minted
          }
        ];
      }
    }
  };

  const fetchCtezVaults = async () => {
    const ctezVaultsPromise = await fetch(
      `https://api.tzkt.io/v1/bigmaps/20919/keys?key.owner=${$store.userAddress}`
    );
    if (ctezVaultsPromise && ctezVaultsPromise.status === 200) {
      const ctezVaults = await ctezVaultsPromise.json();
      if (ctezVaults) {
        allVaults = [
          ...allVaults,
          ...ctezVaults
            .filter(storage => storage.active === true)
            .map(storage => ({
              platform: AvailableVault.CTEZ,
              address: storage.value.address,
              xtzLocked: +storage.value.tez_balance,
              borrowed: +storage.value.ctez_outstanding,
              isLiquidated: false
            }))
            .flat()
        ];
      }
    }
  };

  onMount(async () => {
    if ($store.userAddress) {
      // wXTZ
      await fetchWxtzVaults();
      // kDAO
      await fetchKdaoVaults();
      // Youves
      await fetchYouvesVaults();
      // Ctez
      await fetchCtezVaults();

      vaultsUpdateInterval = setInterval(async () => {
        await fetchWxtzVaults();
        await fetchKdaoVaults();
        await fetchYouvesVaults();
        await fetchCtezVaults();
      }, 60_000 * 10);
    }
  });

  afterUpdate(() => {
    allVaults = [...allVaults.sort((a, b) => b.xtzLocked - a.xtzLocked)];
  });

  onDestroy(() => {
    clearInterval(vaultsUpdateInterval);
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

  .no-vault {
    padding: 20px;
    margin: 20px 0px;
  }
</style>

<div
  class="container"
  on:scroll={() => {
    pillStore.hide(200);
  }}
>
  {#if $store.userAddress}
    <ProfileHeader profileAddress={$store.userAddress} />
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
              checked={$store.localStorage.showLiquidatedVaults}
              on:change={() =>
                $store.localStorage.updateLiquidatedVaultsDisplay(
                  !$store.localStorage.showLiquidatedVaults
                )}
            />
          </label>
        </div>
      </div>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.KDAO)
        .filter( vault => ($store.localStorage.showLiquidatedVaults ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <KdaoVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div class="no-vault">No oven</div>
      {/each}
      <h3>Youves vaults</h3>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.YOUVES)
        .filter( vault => ($store.localStorage.showLiquidatedVaults ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <YouvesVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div class="no-vault">No oven</div>
      {/each}
      <h3>Ctez vaults</h3>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.CTEZ)
        .filter( vault => ($store.localStorage.showLiquidatedVaults ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <CtezVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div class="no-vault">No vault</div>
      {/each}
      <h3>wXTZ vaults</h3>
      {#each allVaults
        .filter(vault => vault.platform === AvailableVault.WXTZ)
        .filter( vault => ($store.localStorage.showLiquidatedVaults ? true : vault.isLiquidated === false) ) as vault (vault.address)}
        <WxtzVaultRow {vault} on:update-xtz-locked={updateXtzLocked} />
      {:else}
        <div class="no-vault">No vault</div>
      {/each}
    </div>
  {:else}
    <div>You must connect your wallet to check your vaults</div>
  {/if}
</div>
