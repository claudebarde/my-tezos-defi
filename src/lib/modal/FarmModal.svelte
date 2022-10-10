<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { OpKind, type WalletParamsWithKind } from "@taquito/taquito";
  import { Option } from "@swan-io/boxed";
  import type {
    modalAction,
    InvestmentPlatform,
    InvestmentData
  } from "../../types";
  import { ToastType } from "../../types";
  import store from "../../store";
  import queueStore from "../transaction-queue/queue-store";
  import { formatTokenAmount } from "../../utils";
  import { getFarmId } from "../../tokenUtils/quipuUtils";
  import toastStore from "../../toastStore";

  export let payload: InvestmentData, platform: InvestmentPlatform;

  let selectedAction: modalAction = "stake";
  let stakeAmount: number | null = null;
  let unstakeAmount: number | null = null;
  let waitingForConf = false;

  const dispatch = createEventDispatcher();

  $: enableTransaction = () => {
    if (selectedAction === "stake" && stakeAmount) {
      return false;
    } else if (selectedAction === "unstake" && unstakeAmount) {
      return false;
    } else {
      return true;
    }
  };

  const forgeTransaction = async (): Promise<
    Option<Array<{ tx: WalletParamsWithKind; description: string }>>
  > => {
    const contract = await $store.Tezos.wallet.at(payload.address);
    const kusdContract = await $store.Tezos.wallet.at(
      $store.tokens.kUSD.address
    );

    switch (platform) {
      case "kdao":
        if (selectedAction === "stake" && stakeAmount) {
          return Option.Some([
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({
                    spender: payload.address,
                    value: stakeAmount * 10 ** $store.tokens.kUSD.decimals
                  })
                  .toTransferParams()
              },
              description: `Approve transfer of ${stakeAmount} kUSD`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...contract.methods
                  .deposit(stakeAmount * 10 ** $store.tokens.kUSD.decimals)
                  .toTransferParams()
              },
              description: `Stake ${stakeAmount} kUSD in ${payload.alias}`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({ spender: payload.address, value: 0 })
                  .toTransferParams()
              },
              description: `Approve transfer of 0 kUSD`
            }
          ]);
        } else if (selectedAction === "unstake" && unstakeAmount) {
          return Option.Some([
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...contract.methods
                  .withdraw(unstakeAmount * 10 ** $store.tokens.kUSD.decimals)
                  .toTransferParams()
              },
              description: `Unstake ${unstakeAmount} kUSD from ${payload.alias}`
            }
          ]);
        } else {
          return Option.None();
        }
      case "quipuswap":
        const farmId = getFarmId(payload.id).match<number | string>({
          Ok: val => val,
          Error: err => err
        });
        if (isNaN(+farmId)) {
          return Promise.reject(farmId);
        }

        if (selectedAction === "stake" && stakeAmount) {
          return Option.Some([
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({
                    spender: payload.address,
                    value: stakeAmount * 10 ** $store.tokens.kUSD.decimals
                  })
                  .toTransferParams()
              },
              description: `Approve transfer of ${stakeAmount} LPT`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...contract.methods
                  .deposit(stakeAmount * 10 ** $store.tokens.kUSD.decimals)
                  .toTransferParams()
              },
              description: `Stake ${stakeAmount} kUSD in ${payload.alias}`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({ spender: payload.address, value: 0 })
                  .toTransferParams()
              },
              description: `Approve transfer of 0 LPT`
            }
          ]);
        } else if (selectedAction === "unstake" && unstakeAmount) {
          return Option.Some([
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...contract.methodsObject
                  .withdraw({
                    fid: farmId,
                    amt: unstakeAmount * 10 ** payload.decimals,
                    receiver: $store.userAddress,
                    rewards_receiver: $store.userAddress
                  })
                  .toTransferParams()
              },
              description: `Unstake ${unstakeAmount} LPT from ${payload.alias}`
            }
          ]);
        } else {
          return Option.None();
        }
      case "plenty":
        if (selectedAction === "stake" && stakeAmount) {
          return Option.Some([
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({
                    spender: payload.address,
                    value: stakeAmount * 10 ** $store.tokens.kUSD.decimals
                  })
                  .toTransferParams()
              },
              description: `Approve transfer of ${stakeAmount} kUSD`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...contract.methods
                  .deposit(stakeAmount * 10 ** $store.tokens.kUSD.decimals)
                  .toTransferParams()
              },
              description: `Stake ${stakeAmount} kUSD in ${payload.alias}`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({ spender: payload.address, value: 0 })
                  .toTransferParams()
              },
              description: `Approve transfer of 0 kUSD`
            }
          ]);
        } else if (selectedAction === "unstake" && unstakeAmount) {
          return Option.Some([
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...contract.methods
                  .withdraw(unstakeAmount * 10 ** $store.tokens.kUSD.decimals)
                  .toTransferParams()
              },
              description: `Unstake ${unstakeAmount} kUSD from ${payload.alias}`
            }
          ]);
        } else {
          return Option.None();
        }
    }
  };

  const addToQueue = async () => {
    const txs = await forgeTransaction();
    txs.match({
      None: () => undefined,
      Some: txs => queueStore.addToQueue(txs)
    });
  };

  const runTransaction = async () => {
    waitingForConf = true;
    const txs = await forgeTransaction();
    try {
      const rawTxs = txs.match({
        None: () => [],
        Some: val => val
      });
      if (rawTxs.length === 0) {
        toastStore.addToast({
          type: ToastType.ERROR,
          message: "This transaction could not be forged",
          dismissable: true
        });
        throw "No transaction was forged for this action";
      }
      const batch = $store.Tezos.wallet.batch([
        ...rawTxs.map(tx => ({ ...tx.tx }))
      ]);
      const batchOp = await batch.send();
      toastStore.addToast({
        type: ToastType.INFO,
        message:
          selectedAction === "stake"
            ? `Staking ${stakeAmount} tokens`
            : `Unstaking ${unstakeAmount} tokens`,
        dismissable: true
      });
      await batchOp.confirmation();
      // updates farm balance
      const newFarmData = {
        ...payload,
        balance:
          selectedAction === "stake"
            ? payload.balance + stakeAmount * 10 ** payload.decimals
            : payload.balance - unstakeAmount * 10 ** payload.decimals
      };
      store.updateInvestments([[newFarmData.id, newFarmData]]);

      toastStore.addToast({
        type: ToastType.SUCCESS,
        message:
          selectedAction === "stake"
            ? `Tokens successfully staked!`
            : `Tokens successfully unstaked!`,
        dismissable: true
      });
    } catch (error) {
      console.error(error);
      toastStore.addToast({
        type: ToastType.ERROR,
        message: "An error has occurred during this transaction",
        dismissable: true
      });
    } finally {
      waitingForConf = false;
    }
  };

  onMount(() => {
    if (payload.balance && payload.balance > 0) {
      selectedAction = "unstake";
      unstakeAmount = +formatTokenAmount(
        payload.balance / 10 ** payload.decimals
      );
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .farm-nav {
    list-style-type: none;
    margin: 0px;
    padding: 0px;
    background-color: $light-cyan;

    li {
      display: inline;
      background-color: $light-cyan;
      padding: 10px;

      button {
        display: inline;
        background-color: transparent;
        border: none;
        font-size: 1rem;
      }

      &.selected {
        background-color: $sky-blue-crayola;
      }
    }
  }

  .plenty-stakes {
    padding: 10px;

    & > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 5px;
    }
  }
</style>

<div class="modal-header">
  <ul class="farm-nav">
    <li
      class:selected={selectedAction === "stake"}
      on:click={() => (selectedAction = "stake")}
    >
      <button>Stake</button>
    </li>
    <li
      class:selected={selectedAction === "unstake"}
      on:click={() => (selectedAction = "unstake")}
    >
      <button>Unstake</button>
    </li>
  </ul>
</div>
<div class="modal-body">
  {#if platform === "quipuswap"}
    {#if selectedAction === "stake"}
      <div>Amount to stake:</div>
      <div class="input-with-max">
        <div class="input-container">
          <input type="number" step="any" bind:value={stakeAmount} />
          <div>LPT</div>
        </div>
        <button class="transparent mini"> max </button>
      </div>
    {:else if selectedAction === "unstake"}
      <div>Amount to unstake:</div>
      <div class="input-with-max">
        <div class="input-container">
          <input type="number" step="any" bind:value={unstakeAmount} />
          <div>LPT</div>
        </div>
        <button
          class="transparent mini"
          on:click={() => {
            unstakeAmount = payload.balance / 10 ** payload.decimals;
          }}
        >
          max
        </button>
      </div>
    {/if}
  {:else if platform === "plenty"}
    {#if selectedAction === "stake"}
      <div>Amount to stake:</div>
      <div class="input-with-max">
        <div class="input-container">
          <input type="number" step="any" bind:value={stakeAmount} />
          <div>LPT</div>
        </div>
        <button class="transparent mini"> max </button>
      </div>
    {:else if selectedAction === "unstake"}
      <div>Stake(s) to remove:</div>
      <div class="plenty-stakes">
        {#if payload.info.length > 0 && Object.values(payload.info[0]).length > 0}
          {#each Object.values(payload.info[0]) as stake}
            <div>
              <span
                >{formatTokenAmount(stake.amount / 10 ** payload.decimals)} LPT</span
              >
              <button class="primary mini">
                {#if waitingForConf}
                  <span class="material-icons-outlined loading">
                    hourglass_empty
                  </span>
                {/if}
                Unstake
              </button>
            </div>
          {/each}
        {:else}
          No stake to display
        {/if}
      </div>
    {/if}
  {:else}
    <div>No stake/unstake feature for this platform</div>
  {/if}
</div>
<div class="modal-footer">
  <div />
  <div class="buttons">
    <button class="primary" disabled={true} on:click={addToQueue}>
      Add to queue
    </button>
    {#if selectedAction === "stake" && platform !== "plenty"}
      <button
        class="primary"
        disabled={enableTransaction() || waitingForConf}
        on:click={runTransaction}
      >
        {#if waitingForConf}
          <span class="material-icons-outlined loading"> hourglass_empty </span>
        {/if}
        Stake
      </button>
    {:else if selectedAction === "unstake" && platform !== "plenty"}
      <button
        class="primary"
        disabled={enableTransaction() || waitingForConf}
        on:click={runTransaction}
      >
        {#if waitingForConf}
          <span class="material-icons-outlined loading"> hourglass_empty </span>
        {/if}
        Unstake
      </button>
    {/if}
    <button
      class="error"
      on:click={() => dispatch("close")}
      disabled={waitingForConf}
    >
      Close
    </button>
  </div>
</div>
