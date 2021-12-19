<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import {
    CONTRACTS,
    Network,
    StableCoinClient,
    HarbingerClient,
    OvenClient
  } from "@hover-labs/kolibri-js";
  import store from "../../../store";
  import localStorageStore from "../../../localStorage";
  import { shortenHash, formatTokenAmount } from "../../../utils";
  import Modal from "../../Modal/Modal.svelte";

  export let address;

  let lockedAmount: number | null = null;
  let kusdOutstanding: number | null = null;
  let kusdCollatUtilization: number | null = null;
  let stabilityFees: number | null = null;
  let kusdLastUpdate = 0;
  let openModal = false;
  let ovenAction: "borrow" | "payBack" | "withdraw" | "deposit";

  onMount(async () => {
    const getBalance = await $store.Tezos.tz.getBalance(address);
    if (getBalance) {
      lockedAmount = getBalance.toNumber() / 10 ** 6;
    } else {
      lockedAmount = 0;
    }

    let rpcUrl = $store.settings[$store.network].rpcUrl;
    if (window.localStorage) {
      const settingsStorage = window.localStorage.getItem("mtd");
      if (settingsStorage) {
        const settings = JSON.parse(settingsStorage);
        rpcUrl = settings.favoriteRpcUrl;
      }
    }

    const harbingerClient = new HarbingerClient(
      rpcUrl,
      CONTRACTS.MAIN.HARBINGER_NORMALIZER
    );
    const stableCoinClient = new StableCoinClient(
      rpcUrl,
      Network.Mainnet,
      CONTRACTS.MAIN.OVEN_REGISTRY,
      CONTRACTS.MAIN.MINTER,
      CONTRACTS.MAIN.OVEN_FACTORY
    );
    const ovenClient = new OvenClient(
      rpcUrl,
      $store.Tezos.signer as any,
      address,
      stableCoinClient,
      harbingerClient
    );

    kusdOutstanding = (await ovenClient.getBorrowedTokens()).toNumber();
    stabilityFees = (await ovenClient.getStabilityFees()).toNumber();
    const collat = await ovenClient.getCollateralizationRatio();
    console.log(collat.toNumber() / 10 ** 18);
  });

  afterUpdate(async () => {
    if (kusdLastUpdate < Date.now() - 10 * 60000) {
      // move code here later
    }
  });
</script>

<div class="vault-row has-sub-row">
  <div class="icon">
    <img src="images/kUSD.png" alt="token-icon" />
  </div>
  <div>
    <a
      href={`https://better-call.dev/mainnet/${address}/operations`}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {shortenHash(address)}
    </a>
  </div>
  <div>
    {#if lockedAmount || lockedAmount === 0}
      <span>
        {lockedAmount} ꜩ
      </span>
      <span style="font-size:0.8rem">
        ({formatTokenAmount(lockedAmount * $store.xtzData.exchangeRate, 2)}
        {$localStorageStore.preferredFiat})
      </span>
    {:else}
      <span class="material-icons"> hourglass_empty </span>
    {/if}
  </div>
  <div />
  <div>
    <button
      class="mini"
      on:click={() => localStorageStore.removeVault("kusd", address)}
    >
      <span class="material-icons"> delete </span>
    </button>
  </div>
</div>
{#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
  <div class="vault-sub-row">
    <div />
    <div class="stats">
      <div class="stats__stat-block">
        <div>Minted kUSD</div>
        <div>
          {kusdOutstanding
            ? formatTokenAmount(
                kusdOutstanding / 10 ** $store.tokens.kUSD.decimals
              )
            : "---"} kUSD
        </div>
      </div>
      <div class="stats__stat-block">
        <div>Stability fees</div>
        <div>
          {stabilityFees
            ? `${formatTokenAmount(
                stabilityFees / 10 ** $store.tokens.kUSD.decimals
              )} kUSD`
            : "N/A"}
        </div>
      </div>
      <div class="stats__stat-block">
        <div>Collateral utilization</div>
        <div>
          {kusdCollatUtilization ?? "---"}%
        </div>
      </div>
      <div>:)</div>
    </div>
    <div />
    <div />
    <div class="actions">
      <div>
        <button
          class="primary"
          on:click={() => {
            ovenAction = "borrow";
            openModal = true;
          }}
        >
          Borrow kUSD
        </button>
      </div>
      <div>
        <button
          class="primary"
          on:click={() => {
            ovenAction = "payBack";
            openModal = true;
          }}
        >
          Pay back kUSD
        </button>
      </div>
      <div>
        <button
          class="primary"
          on:click={() => {
            ovenAction = "deposit";
            openModal = true;
          }}
        >
          Deposit XTZ
        </button>
      </div>
      <div>
        <button
          class="primary"
          on:click={() => {
            ovenAction = "withdraw";
            openModal = true;
          }}
        >
          Withdraw XTZ
        </button>
      </div>
    </div>
  </div>
{/if}
{#if openModal}
  <Modal type="small" on:close={() => (openModal = false)}>
    <div slot="modal-title" class="modal-title">
      <div>
        {#if ovenAction === "borrow"}
          Borrow kUSD
        {:else if ovenAction === "deposit"}
          Deposit XTZ
        {:else if ovenAction === "payBack"}
          Pay back kUSD
        {:else if ovenAction === "withdraw"}
          Withdraw XTZ
        {/if}
      </div>
    </div>
    <div slot="modal-body" class="modal-body">
      {#if ovenAction === "borrow"}
        <div class="modal-line">
          <input type="text" placeholder="Amount of kUSD to borrow" />
        </div>
      {:else if ovenAction === "deposit"}
        <div class="modal-line">
          <input type="text" placeholder="Amount of XTZ to deposit" />
        </div>
      {:else if ovenAction === "payBack"}
        <div class="modal-line">
          <input type="text" placeholder="Amount of kUSD to pay back" />
        </div>
      {:else if ovenAction === "withdraw"}
        <div class="modal-line">
          <input type="text" placeholder="Amount of XTZ to withdraw" />
        </div>
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button class="primary">Confirm</button>
        <button class="primary" on:click={() => (openModal = false)}>
          Close
        </button>
      </div>
    </div>
  </Modal>
{/if}
