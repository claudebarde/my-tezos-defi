<script lang="ts">
  import { afterUpdate } from "svelte";
  import Modal from "../Modal/Modal.svelte";
  import store from "../../store";
  import { AvailableFiat } from "../../types";
  import workersStore from "../../workersStore";
  import FeeDisclaimer from "../Modal/FeeDisclaimer.svelte";
  import config from "../../config";

  let openSettings = false;
  let newRpcNode = "";
  let newFiat: AvailableFiat;

  afterUpdate(() => {
    if (!openSettings) {
      newFiat = undefined;
    }
  });
</script>

<style lang="scss">
  .settings {
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto;
    align-items: center;
    gap: 30px 10px;

    #currencies-datalist {
      width: 100px;
    }
  }
</style>

<!--
-->
<span
  class="material-icons"
  style="cursor:pointer"
  on:click={() => (openSettings = true)}
>
  settings
</span>
{#if openSettings}
  <Modal type="manage" on:close={() => (openSettings = false)}>
    <div slot="modal-title" class="modal-title">Settings</div>
    <div slot="modal-body" class="modal-body">
      <div class="settings">
        <div>Change currency</div>
        <div>
          <input
            type="text"
            list="currencies"
            id="currencies-datalist"
            bind:value={newFiat}
            placeholder={$store.xtzData.toFiat}
          />
          <button
            class="button mini"
            on:click={() => {
              if (
                newFiat !== $store.xtzData.toFiat &&
                Object.keys(AvailableFiat).includes(newFiat)
              ) {
                store.updateToFiat(newFiat);
                $workersStore.quipuWorker.postMessage({
                  type: "change-fiat",
                  payload: newFiat
                });
                openSettings = false;
              } else {
                newFiat = undefined;
              }
            }}
          >
            Change
          </button>
          <datalist id="currencies">
            {#each config.validFiats as fiat}
              <option value={fiat.code}>{fiat.name}</option>
            {/each}
          </datalist>
        </div>
        <!--
        <div>Allow contribution</div>
        <FeeDisclaimer />
        <div>Allow Push Notifications</div>
        <div>
          <div>
            Push notifications will only be sent when the app is open and when
            you receive/send a transaction
          </div>
          <div>
            <button class="button mini" style="float:right">Disable</button>
            <button class="button mini" style="float:right">Allow</button>
          </div>
        </div>
        <div>Change RPC node</div>
        <div>
          <input type="text" list="rpc-nodes" placeholder={newRpcNode} />
          <button class="button mini">Change</button>
          <datalist id="rpc-nodes">
            <option value={$store.settings[$store.network].rpcUrl}>
              Tezos Giganode
            </option>
            <option value="https://api.tez.ie/rpc/mainnet">ECAD Labs</option>
            <option value="https://mainnet.smartpy.io/">SmartPy</option>
            <option value="https://rpc.tzbeta.net/">Blockscale</option>
            <option value="https://teznode.letzbake.com/">LetzBake!</option>
          </datalist>
        </div>
        -->
      </div>
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button
          class="button secondary"
          on:click={() => {
            openSettings = false;
          }}
        >
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
