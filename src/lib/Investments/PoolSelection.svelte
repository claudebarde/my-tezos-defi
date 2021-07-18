<script lang="ts">
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import Modal from "../Modal/Modal.svelte";

  export let platform;

  let isModalOpen = false;

  const showModal = () => {
    isModalOpen = true;
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
    <button class="button main" on:click={showModal}>Select</button>
  </div>
{:else if platform === "flame"}
  <div class="container-investments-select">
    <div>Flame</div>
    <br />
    <button class="button main">Coming soon</button>
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
        Cruncy Farms
      {:else if platform === "flame"}
        Flame Farms
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
            <div>{investment[0]}</div>
            <div>
              {#if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span class="material-icons"> check_box </span>
              {:else}
                <span class="material-icons"> check_box_outline_blank </span>
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
            <div>{investment[0]}</div>
            <div>
              {#if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span class="material-icons"> check_box </span>
              {:else}
                <span class="material-icons"> check_box_outline_blank </span>
              {/if}
            </div>
          </div>
        {/each}
      {:else if platform === "crunchy"}
        {#each Object.entries($store.investments)
          .filter(inv => inv[1].platform === "crunchy")
          .sort((a, b) => a[0]
              .toLowerCase()
              .localeCompare(b[0].toLowerCase())) as investment}
          <div class="investment-selection-row">
            <div>{investment[0]}</div>
            <div>
              {#if $localStorageStore.favoriteInvestments.includes(investment[0])}
                <span class="material-icons"> check_box </span>
              {:else}
                <span class="material-icons"> check_box_outline_blank </span>
              {/if}
            </div>
          </div>
        {/each}
      {:else if platform === "flame"}
        <div>Coming soon</div>
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
