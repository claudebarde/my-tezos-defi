<script lang="ts">
  import { validateAddress } from "@taquito/utils";
  import store from "../../store";
  import Modal from "../Modal/Modal.svelte";
  import { fetchAddressFromTezosDomain } from "../../utils";

  export let tokenSymbol;

  let openSendConfirmation = false;
  let amount = "";
  let invalidAmount = false;
  let recipient = "";
  let addressFromTezosDomain = "";
  let invalidRecipient = false;
  let sending = false;

  const confirm = async () => {
    // calculates fee
    const amountToSendInXtz =
      +amount * +$store.tokensExchangeRates[tokenSymbol].realPriceInTez;
    let fee = 0;
    if ($store.serviceFee !== null) {
      fee = (amountToSendInXtz * $store.serviceFee) / 100;
    }
    // prepares contract call
    const contract = await $store.Tezos.wallet.at(
      $store.tokens[tokenSymbol].address
    );
    let contractCall;
    if ($store.tokens[tokenSymbol].type === "fa1.2") {
      contractCall = contract.methods.transfer(
        $store.userAddress,
        addressFromTezosDomain ? addressFromTezosDomain : recipient,
        +amount * 10 ** $store.tokens[tokenSymbol].decimals
      );
    } else if ($store.tokens[tokenSymbol].type === "fa2") {
      contractCall = contract.methods.transfer([
        {
          from_: $store.userAddress,
          txs: [
            {
              to_: addressFromTezosDomain ? addressFromTezosDomain : recipient,
              token_id: $store.tokens[tokenSymbol].tokenId,
              amount: +amount * 10 ** $store.tokens[tokenSymbol].decimals
            }
          ]
        }
      ]);
    }

    try {
      sending = true;
      openSendConfirmation = false;

      let op;
      if (fee > 0) {
        // creates batches operations when a fee is set
        const batch = await $store.Tezos.wallet
          .batch()
          .withContractCall(contractCall)
          .withTransfer({
            to: $store.admin,
            amount: Math.ceil(fee * 10 ** 6),
            mutez: true
          });
        op = await batch.send();
      } else {
        // sends operation
        op = await contractCall.send();
      }
      await op.confirmation();
      // resets UI
      recipient = "";
      amount = "";
    } catch (error) {
      console.error(error);
    } finally {
      sending = false;
    }
  };
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .send-token {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 15px;
  }

  @media only screen and (max-width: $mobile-break-point) {
    .send-token {
      flex-direction: column;
    }
  }
</style>

{#if $store.tokensBalances && $store.tokensBalances[tokenSymbol]}
  <div class="send-token">
    Send <input
      type="text"
      class="amount"
      class:error={invalidAmount}
      disabled={sending}
      placeholder={`Max: ${
        Math.floor($store.tokensBalances[tokenSymbol] * 1000) / 1000
      }`}
      on:input={() => {
        invalidAmount = false;
      }}
      bind:value={amount}
    />
    {tokenSymbol} to
    <input
      type="text"
      class:error={invalidRecipient}
      disabled={sending}
      placeholder="Tezos address"
      bind:value={recipient}
      on:input={() => (invalidRecipient = false)}
    />
    {#if sending}
      <button class="button mini loading">
        Sending <span class="material-icons"> send </span>
      </button>
    {:else}
      <button
        class="button mini"
        on:click={async () => {
          let isAmountValid = false;
          let isRecipientValid = false;
          // validates amount
          if (
            amount.trim().length > 0 &&
            !isNaN(+amount) &&
            +amount <= +$store.tokensBalances[tokenSymbol]
          ) {
            isAmountValid = true;
          } else {
            invalidAmount = true;
          }
          // validates address
          if (validateAddress(recipient) === 3) {
            isRecipientValid = true;
          } else {
            // checks if Tezos domain
            const tezosDomainUser = await fetchAddressFromTezosDomain(
              recipient
            );
            if (tezosDomainUser) {
              addressFromTezosDomain = tezosDomainUser;
              isRecipientValid = true;
            } else {
              invalidRecipient = true;
            }
          }

          openSendConfirmation = isAmountValid && isRecipientValid;
        }}
      >
        Send <span class="material-icons hover"> send </span>
      </button>
    {/if}
  </div>
{/if}
{#if openSendConfirmation}
  <Modal type="manage" on:close={() => (openSendConfirmation = false)}>
    <div slot="modal-title" class="modal-title">
      Confirm {tokenSymbol} transfer
    </div>
    <div slot="modal-body" class="modal-body">
      <div>You are about to send</div>
      <div>{amount} {tokenSymbol}</div>
      <div>to</div>
      <div>{recipient}</div>
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button
          class="button main"
          on:click={() => {
            openSendConfirmation = false;
          }}
        >
          Close
        </button>
        <button class="button main" on:click={confirm}> Confirm </button>
      </div>
    </div>
  </Modal>
{/if}
