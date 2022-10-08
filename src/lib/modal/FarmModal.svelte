<script lang="ts">
  import { onMount } from "svelte";
  import { OpKind, type WalletParamsWithKind } from "@taquito/taquito";
  import { Option } from "@swan-io/boxed";
  import type {
    modalAction,
    InvestmentPlatform,
    InvestmentData
  } from "../../types";
  import store from "../../store";
  import queueStore from "../transaction-queue/queue-store";
  import { formatTokenAmount } from "../../utils";
  import { getFarmId } from "../../tokenUtils/quipuUtils";

  export let payload: InvestmentData, platform: InvestmentPlatform;

  let selectedAction: modalAction = "stake";
  let stakeAmount: number | null = null;
  let unstakeAmount: number | null = null;

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
    const txs = await forgeTransaction();
    console.log(txs);
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
  {#if selectedAction === "stake"}
    <label>
      <span>Amount to stake:</span>
      <input type="number" step="any" bind:value={stakeAmount} />
      <span>LPT</span>
    </label>
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
          unstakeAmount = +formatTokenAmount(
            payload.balance / 10 ** payload.decimals
          );
        }}>max</button
      >
    </div>
  {/if}
</div>
<div class="modal-footer">
  <div />
  <div class="buttons">
    <button class="primary" disabled={true} on:click={addToQueue}>
      Add to queue
    </button>
    {#if selectedAction === "stake"}
      <button
        class="primary"
        disabled={enableTransaction()}
        on:click={runTransaction}
      >
        Stake
      </button>
    {:else if selectedAction === "unstake"}
      <button
        class="primary"
        disabled={enableTransaction()}
        on:click={runTransaction}
      >
        Unstake
      </button>
    {/if}
  </div>
</div>
