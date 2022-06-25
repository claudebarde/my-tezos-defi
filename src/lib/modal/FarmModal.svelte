<script lang="ts">
  import { OpKind, type WalletParamsWithKind } from "@taquito/taquito";
  import { Option } from "@swan-io/boxed";
  import type {
    modalAction,
    TezosContractAddress,
    InvestmentPlatform,
    AvailableInvestment
  } from "../../types";
  import store from "../../store";
  import queueStore from "$lib/transaction-queue/queue-store";

  export let payload: {
      farmAddress: TezosContractAddress;
      farmId: AvailableInvestment;
      farmAlias: string;
    },
    platform: InvestmentPlatform;

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
    const contract = await $store.Tezos.wallet.at(payload.farmAddress);
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
                    spender: payload.farmAddress,
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
              description: `Stake ${stakeAmount} kUSD in ${payload.farmAlias}`
            },
            {
              tx: {
                kind: OpKind.TRANSACTION,
                ...kusdContract.methodsObject
                  .approve({ spender: payload.farmAddress, value: 0 })
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
              description: `Unstake ${unstakeAmount} kUSD from ${payload.farmAlias}`
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
      <input type="number" bind:value={stakeAmount} />
      <span>kUSD</span>
    </label>
  {:else if selectedAction === "unstake"}
    <label>
      <span>Amount to unstake:</span>
      <input type="number" bind:value={unstakeAmount} />
      <span>kUSD</span>
    </label>
  {/if}
</div>
<div class="modal-footer">
  <div />
  <div class="buttons">
    <button
      class="primary"
      disabled={enableTransaction()}
      on:click={addToQueue}
    >
      Add to queue
    </button>
    {#if selectedAction === "stake"}
      <button class="primary" disabled={enableTransaction()}>Stake</button>
    {:else if selectedAction === "unstake"}
      <button class="primary" disabled={enableTransaction()}>Unstake</button>
    {/if}
  </div>
</div>
