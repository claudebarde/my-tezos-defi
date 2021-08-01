<script lang="ts">
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import Modal from "../Modal/Modal.svelte";
  import { loadInvestment, shortenHash } from "../../utils";

  export let platform;

  let isModalOpen = false;
  let loadingInv = "";
  let newWxtzVault = "";
  let crunchyFarms;

  const showModal = async () => {
    isModalOpen = true;

    if (platform === "crunchy") {
      crunchyFarms = await loadCrunchyFarms();
    }
  };

  const loadCrunchyFarms = async () => {
    if (
      $store.investments &&
      $store.investments.hasOwnProperty("CRUNCHY-FARMS")
    ) {
      let farmsData = undefined;
      if (
        window.sessionStorage &&
        window.sessionStorage.getItem("crunchy-farms")
      ) {
        farmsData = JSON.parse(window.sessionStorage.getItem("crunchy-farms"));
      } else {
        // loads contract and storage
        const contract = await $store.Tezos.wallet.at(
          $store.investments["CRUNCHY-FARMS"].address
        );
        const storage: any = await contract.storage();
        // loads available farms
        const numberOfFarms = storage.nextFarmId.toNumber() - 1;
        // loads farms with TzKT API
        const url = `https://api.tzkt.io/v1/contracts/KT1KnuE87q1EKjPozJ5sRAjQA24FPsP57CE3/bigmaps/ledger/keys?limit=${numberOfFarms}&key.address=${$store.userAddress}&active=true`;
        const farmsResponse = await fetch(url);
        if (farmsResponse) {
          const activeFarms = await farmsResponse.json();
          farmsData = await Promise.all(
            activeFarms.map(farm => storage.farms.get(farm.key.nat))
          );
        }
      }

      return farmsData;
    }
  };

  const addFavoriteInvestment = async investment => {
    // fetches balance for investment
    loadingInv = investment;
    const savedInv = await loadInvestment(investment);
    if (savedInv) {
      store.updateInvestments({
        ...$store.investments,
        [savedInv.id]: {
          ...$store.investments[savedInv.id],
          balance: savedInv.balance,
          info: savedInv.info,
          favorite: true,
          shareValueInTez:
            savedInv.id === "PLENTY-XTZ-LP"
              ? savedInv.shareValueInTez
              : undefined
        }
      });
      // saves investment into the local storage
      localStorageStore.addFavoriteInvestment(investment);
    }

    loadingInv = "";
  };

  const removeFavoriteInvestment = async investment => {
    loadingInv = investment;

    // removes investment from local storage
    localStorageStore.removeFavoriteInvestment(investment);
    // resets balance to zero in store
    store.updateInvestments({
      ...$store.investments,
      [investment]: {
        ...$store.investments[investment],
        balance: 0,
        favorite: false
      }
    });

    loadingInv = "";
  };
</script>

<style lang="scss">
  .container-investments-select {
    text-align: center;
    padding: 10px;
  }

  .investment-selection-row {
    padding: 5px;
    width: 80%;
    display: flex;
    justify-content: space-between;

    .material-icons.checkbox {
      cursor: pointer;
    }
  }
</style>

{#if platform === "quipuswap"}
  <div class="container-investments-select">
    <div>
      QuipuSwap ({$localStorageStore.favoriteInvestments.filter(
        inv => $store.investments[inv].platform === "quipuswap"
      ).length})
    </div>
    <br />
    <button class="button main" on:click={showModal}>Select</button>
  </div>
{:else if platform === "plenty"}
  <div class="container-investments-select">
    <div>
      Plenty ({$localStorageStore.favoriteInvestments.filter(
        inv => $store.investments[inv].platform === "plenty"
      ).length})
    </div>
    <br />
    <button class="button main" on:click={showModal}>Select</button>
  </div>
{:else if platform === "crunchy"}
  <div class="container-investments-select">
    <div>
      Crunchy ({$localStorageStore.favoriteInvestments.filter(
        inv => $store.investments[inv].platform === "crunchy"
      ).length})
    </div>
    <br />
    <button class="button main">Coming soon</button>
  </div>
{:else if platform === "paul"}
  <div class="container-investments-select">
    <div>
      Paul ({$localStorageStore.favoriteInvestments.filter(
        inv => $store.investments[inv].platform === "paul"
      ).length})
    </div>
    <br />
    <button class="button main" on:click={showModal}>Select</button>
  </div>
{:else if platform === "kdao"}
  <div class="container-investments-select">
    <div>
      kDAO ({$localStorageStore.favoriteInvestments.filter(
        inv => $store.investments[inv].platform === "kdao"
      ).length})
    </div>
    <br />
    <button class="button main" on:click={showModal}>Select</button>
  </div>
{:else if platform === "flame"}
  <div class="container-investments-select">
    <div>Flame</div>
    <br />
    <button class="button main">Coming soon</button>
  </div>
{:else if platform === "wxtz"}
  <div class="container-investments-select">
    <div>
      wXTZ ({$localStorageStore.wXtzVaults.length})
    </div>
    <br />
    <button class="button main" on:click={showModal}>Vaults</button>
  </div>
{/if}
{#if isModalOpen}
  <Modal type="manage" on:close={() => (isModalOpen = false)}>
    <div slot="modal-title" class="modal-title">
      {#if platform === "quipuswap"}
        QuipuSwap Pools
      {:else if platform === "plenty"}
        Plenty Pools and Farms
      {:else if platform === "crunchy"}
        Crunchy Farms
      {:else if platform === "paul"}
        Paul Farms
      {:else if platform === "flame"}
        Flame Farms
      {:else if platform === "kdao"}
        kDAO Farms
      {:else if platform === "wxtz"}
        wXTZ Vaults
      {/if}
    </div>
    <div slot="modal-body" class="modal-body">
      {#if platform === "quipuswap"}
        {#each Object.entries($store.investments)
          .filter(inv => inv[1].platform === "quipuswap")
          .sort((a, b) => a[0]
              .toLowerCase()
              .localeCompare(b[0].toLowerCase())) as investment}
          <div class="investment-selection-row">
            <div>{investment[1].alias}</div>
            <div>
              {#if loadingInv === investment[0]}
                <span class="material-icons"> hourglass_empty </span>
              {:else if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span
                  class="material-icons checkbox"
                  on:click={() => removeFavoriteInvestment(investment[0])}
                >
                  check_box
                </span>
              {:else}
                <span
                  class="material-icons checkbox"
                  on:click={() => addFavoriteInvestment(investment[0])}
                >
                  check_box_outline_blank
                </span>
              {/if}
            </div>
          </div>
        {/each}
      {:else if platform === "plenty"}
        {#each Object.entries($store.investments)
          .filter(inv => inv[1].platform === "plenty")
          .sort((a, b) => a[0]
              .toLowerCase()
              .localeCompare(b[0].toLowerCase())) as investment}
          <div class="investment-selection-row">
            <div>{investment[1].alias}</div>
            <div>
              {#if loadingInv === investment[0]}
                <span class="material-icons"> hourglass_empty </span>
              {:else if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span
                  class="material-icons checkbox"
                  on:click={() => removeFavoriteInvestment(investment[0])}
                >
                  check_box
                </span>
              {:else}
                <span
                  class="material-icons checkbox"
                  on:click={() => addFavoriteInvestment(investment[0])}
                >
                  check_box_outline_blank
                </span>
              {/if}
            </div>
          </div>
        {/each}
      {:else if platform === "crunchy"}
        {#if crunchyFarms && Array.isArray(crunchyFarms) && crunchyFarms.length > 0}
          {#each crunchyFarms as farm}
            {#if window.sessionStorage && window.sessionStorage.getItem("tez-tools-prices")}
              {JSON.parse(
                window.sessionStorage.getItem("tez-tools-prices")
              ).contracts.filter(
                tk => tk.tokenAddress === farm.poolToken.address
              )[0].name}
            {:else}
              {shortenHash(farm.poolToken.address)}
            {/if}
          {/each}
        {:else}
          <div>No stake in any Crunchy farms</div>
        {/if}
      {:else if platform === "paul"}
        {#each Object.entries($store.investments)
          .filter(inv => inv[1].platform === "paul")
          .sort((a, b) => a[0]
              .toLowerCase()
              .localeCompare(b[0].toLowerCase())) as investment}
          <div class="investment-selection-row">
            <div>{investment[1].alias}</div>
            <div>
              {#if loadingInv === investment[0]}
                <span class="material-icons"> hourglass_empty </span>
              {:else if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span
                  class="material-icons checkbox"
                  on:click={() => removeFavoriteInvestment(investment[0])}
                >
                  check_box
                </span>
              {:else}
                <span
                  class="material-icons checkbox"
                  on:click={() => addFavoriteInvestment(investment[0])}
                >
                  check_box_outline_blank
                </span>
              {/if}
            </div>
          </div>
        {/each}
      {:else if platform === "kdao"}
        {#each Object.entries($store.investments)
          .filter(inv => inv[1].platform === "kdao")
          .sort((a, b) => a[0]
              .toLowerCase()
              .localeCompare(b[0].toLowerCase())) as investment}
          <div class="investment-selection-row">
            <div>{investment[1].alias}</div>
            <div>
              {#if loadingInv === investment[0]}
                <span class="material-icons"> hourglass_empty </span>
              {:else if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span
                  class="material-icons checkbox"
                  on:click={() => removeFavoriteInvestment(investment[0])}
                >
                  check_box
                </span>
              {:else}
                <span
                  class="material-icons checkbox"
                  on:click={() => addFavoriteInvestment(investment[0])}
                >
                  check_box_outline_blank
                </span>
              {/if}
            </div>
          </div>
        {/each}
      {:else if platform === "flame"}
        <div>Coming soon</div>
      {:else if platform === "wxtz"}
        <div>
          {#each $localStorageStore.wXtzVaults as vault}
            {#await $store.Tezos.tz.getBalance(vault)}
              Loading {shortenHash(vault)}...
            {:then value}
              <span class="material-icons" style="vertical-align:sub">
                inventory_2
              </span>
              <span>{shortenHash(vault)}: {+value / 10 ** 6} ꜩ</span>
            {:catch error}
              Unable to load the vault
            {/await}
          {:else}
            No vault
          {/each}
        </div>
        <br />
        <br />
        <div>Add a new vault:</div>
        <br />
        <div style="display:flex">
          <input type="text" bind:value={newWxtzVault} />
          <button
            class="button main"
            on:click={() => {
              localStorageStore.addWxtzVault(newWxtzVault);
              newWxtzVault = "";
            }}
          >
            Add
          </button>
        </div>
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button
          class="button secondary"
          on:click={() => {
            isModalOpen = false;
          }}
        >
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
