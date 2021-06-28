<script lang="ts">
  import Modal from "../Modal/Modal.svelte";
  import store from "../../store";

  let openSettings = false;
  let newRpcNode = $store.settings[$store.network].rpcUrl;
</script>

<style lang="scss">
  .settings {
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: auto;
    align-items: center;
    gap: 30px 10px;
  }
</style>

<!--<span
  class="material-icons"
  style="cursor:pointer"
  on:click={() => (openSettings = true)}
>
  settings
</span>-->
{#if openSettings}
  <Modal type="manage" on:close={() => (openSettings = false)}>
    <div slot="modal-title" class="modal-title">Settings</div>
    <div slot="modal-body" class="modal-body">
      <div class="settings">
        <div>Change currency</div>
        <div>
          <input type="text" list="currencies" />
          <button class="button mini">Change</button>
          <datalist id="currencies">
            <option value="USD">US dollar</option>
            <option value="EUR">Euro</option>
            <option value="CAD">Canadian dollar</option>
            <option value="GBP">British pound</option>
          </datalist>
        </div>
        <div>Allow Push Notifications</div>
        <div>
          <div>
            Push noticatifications will only be sent when the app is open and
            when you receive/send a transaction
          </div>
          <div>
            <button class="button mini" style="float:right">Disable</button>
            <button class="button mini" style="float:right">Allow</button>
          </div>
        </div>
        <div>Change RPC node</div>
        <div>
          <input type="text" list="rpc-nodes" bind:value={newRpcNode} />
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
      </div>
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button
          class="button default"
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
