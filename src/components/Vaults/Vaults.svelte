<script lang="ts">
  import { afterUpdate } from "svelte";
  import { fly } from "svelte/transition";
  import { validateContractAddress } from "@taquito/utils";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import Row from "./Row.svelte";

  let selectKusdVaults = false;
  let selectWxtzVaults = false;
  let selectUusdVaults = false;
  let kusdNewVault = "";
  let wxtzNewVault = "";
  let uusdNewVault = "";
  let localVaultAddresses = [];
  let totalLocked: number | null = null;

  afterUpdate(async () => {
    const allVaults = [
      ...$localStorageStore.wXtzVaults,
      ...$localStorageStore.kUsdVaults,
      ...$localStorageStore.uUsdVaults
    ];
    if (
      allVaults.length > 0 &&
      allVaults.length !== localVaultAddresses.length
    ) {
      // fetches all the balances of the vaults
      localVaultAddresses = allVaults;
      const balancesPromise = await Promise.all(
        allVaults.map(vault => $store.Tezos.tz.getBalance(vault))
      );
      totalLocked = [
        0,
        ...balancesPromise.map(balance => {
          if (balance) {
            return balance.toNumber();
          } else {
            return 0;
          }
        })
      ].reduce((a, b) => a + b);
      console.log(totalLocked);
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    .user-vaults-stats {
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 1.4rem;
      padding: 10px;
      text-align: center;
    }

    .vault-selection {
      display: flex;
      justify-content: space-around;
      align-items: center;

      #kusd-vaults {
        position: relative;
        height: 60px;

        .select-kusd-vaults {
          z-index: 100;
          width: 440px;
          height: 100px;
          border: none;
          border-radius: 10px;
          position: absolute;
          top: 70px;
          left: -80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
          background-color: white;
          padding: 5px;
          text-align: center;
        }
      }

      #wxtz-vaults {
        position: relative;
        height: 60px;

        .select-wxtz-vaults {
          z-index: 100;
          width: 440px;
          height: 100px;
          border: none;
          border-radius: 10px;
          position: absolute;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
          background-color: white;
          padding: 5px;
          text-align: center;
        }
      }

      #uusd-vaults {
        position: relative;
        height: 60px;

        .select-uusd-vaults {
          z-index: 100;
          width: 440px;
          height: 100px;
          border: none;
          border-radius: 10px;
          position: absolute;
          top: 70px;
          right: -80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-shadow: rgba(0, 0, 0, 0.24) 0px 3px 8px;
          background-color: white;
          padding: 5px;
        }
      }

      .input-new-vault {
        display: flex;
        justify-content: center;

        input {
          width: 200px;
        }
      }
    }

    .row-header {
      display: grid;
      grid-template-columns: 10% 25% 20% 17% 16% 12%;
      padding: 10px;
      align-items: center;
    }
  }
</style>

<section>
  <div class="user-vaults-stats">
    <div class="total-value">
      <div>Total value locked in vaults</div>
      <div>
        {(+(totalLocked / 10 ** 6).toFixed(3)).toLocaleString("en-US")} ꜩ
      </div>
      <div>
        {(
          +((totalLocked / 10 ** 6) * $store.xtzData.exchangeRate).toFixed(2) /
          1
        ).toLocaleString("en-US")}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
  </div>
  <br />
  <div class="vault-selection">
    <div id="kusd-vaults">
      <button
        class="primary"
        on:click={() => {
          selectKusdVaults = !selectKusdVaults;
          selectWxtzVaults = false;
          selectUusdVaults = false;
        }}
      >
        <img src="images/kUSD.png" alt="kUSD" />
        &nbsp; kUSD
        <span class="material-icons"> arrow_drop_down </span>
      </button>
      {#if selectKusdVaults}
        <div
          class="select-kusd-vaults"
          transition:fly={{ duration: 400, y: 100 }}
        >
          <div>Add a new oven</div>
          <br />
          <div class="input-new-vault">
            <input type="text" bind:value={kusdNewVault} />
            <button
              class="mini"
              on:click={() => {
                if (validateContractAddress(kusdNewVault) === 3) {
                  localStorageStore.addVault("kusd", kusdNewVault);
                  kusdNewVault = "";
                  selectKusdVaults = false;
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      {/if}
    </div>
    <div id="wxtz-vaults">
      <button
        class="primary"
        on:click={() => {
          selectWxtzVaults = !selectWxtzVaults;
          selectKusdVaults = false;
          selectUusdVaults = false;
        }}
      >
        <img src={$store.tokens.wXTZ.thumbnail} alt="wXTZ" />
        &nbsp; wXTZ
        <span class="material-icons"> arrow_drop_down </span>
      </button>
      {#if selectWxtzVaults}
        <div
          class="select-wxtz-vaults"
          transition:fly={{ duration: 400, y: 100 }}
        >
          <div>Add a new vault</div>
          <br />
          <div class="input-new-vault">
            <input type="text" bind:value={wxtzNewVault} />
            <button
              class="mini"
              on:click={() => {
                if (validateContractAddress(wxtzNewVault) === 3) {
                  localStorageStore.addVault("wxtz", wxtzNewVault);
                  wxtzNewVault = "";
                  selectWxtzVaults = false;
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      {/if}
    </div>
    <div id="uusd-vaults">
      <button
        class="primary"
        on:click={() => {
          selectUusdVaults = !selectUusdVaults;
          selectKusdVaults = false;
          selectWxtzVaults = false;
        }}
      >
        <img src={$store.tokens.uUSD.thumbnail} alt="uUSD" />
        &nbsp; Youves
        <span class="material-icons"> arrow_drop_down </span>
      </button>
      {#if selectUusdVaults}
        <div
          class="select-uusd-vaults"
          transition:fly={{ duration: 400, y: 100 }}
        >
          <div>Add a new vault</div>
          <br />
          <div class="input-new-vault">
            <input type="text" bind:value={uusdNewVault} />
            <button
              class="mini"
              on:click={() => {
                if (validateContractAddress(uusdNewVault) === 3) {
                  localStorageStore.addVault("uusd", uusdNewVault);
                  uusdNewVault = "";
                  selectUusdVaults = false;
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <br />
  {#if $localStorageStore.wXtzVaults.length === 0 && $localStorageStore.kUsdVaults.length === 0 && $localStorageStore.uUsdVaults.length === 0}
    <div>No vault or oven</div>
  {/if}
  <!-- wXTZ -->
  {#if $localStorageStore.wXtzVaults.length > 0}
    <div class="row-header">
      <div />
      <div>Vault</div>
      <div>Locked</div>
    </div>
    {#each $localStorageStore.wXtzVaults as address}
      <Row {address} platform="wxtz" valueInXtz={true} />
    {/each}
  {/if}
  <br />
  <!-- kUSD -->
  {#if $localStorageStore.kUsdVaults.length > 0}
    <div class="row-header">
      <div />
      <div>Oven</div>
      <div>Locked</div>
    </div>
    {#each $localStorageStore.kUsdVaults as address}
      <Row {address} platform="kusd" valueInXtz={true} />
    {/each}
  {/if}
  <br />
  <!-- uUSD -->
  {#if $localStorageStore.uUsdVaults.length > 0}
    <div class="row-header">
      <div />
      <div>Vault</div>
      <div>Locked</div>
    </div>
    {#each $localStorageStore.uUsdVaults as address}
      <Row {address} platform="uusd" valueInXtz={true} />
    {/each}
  {/if}
</section>
