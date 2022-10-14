<script lang="ts">
  import type { ContractMethodObject, Wallet } from "@taquito/taquito";
  import { createEventDispatcher } from "svelte";
  import { validateAddress } from "@taquito/utils";
  import { Option, Result } from "@swan-io/boxed";
  import type { AvailableToken } from "../../types";
  import store from "../../store";
  import {
    formatTokenAmount,
    shortenHash,
    prepareOperation
  } from "../../utils";
  import pillStore, {
    PillBehavior,
    PillTextType,
    PillShape
  } from "../pill/pillStore";

  export let payload: { token: AvailableToken; balance: number };

  const dispatch = createEventDispatcher();

  let amount: Option<number> = Option.None();
  let amountInXtz: Option<number> = Option.None();
  let recipientAddress: Option<string> = Option.None();
  let recipientAddressError = false;

  const updateAmount = ev => {
    const val = +ev.target.value;
    if (!isNaN(val) && val !== 0) {
      amount = Option.Some(val);
      amountInXtz = Option.Some(
        +formatTokenAmount(val * $store.tokens[payload.token].getExchangeRate())
      );
    } else {
      amount = Option.None();
    }
  };

  const updateRecipientAddress = ev => {
    recipientAddressError = false;

    const val = ev.target.value;
    if (validateAddress(val) === 3) {
      recipientAddress = Option.Some(val);
    } else if (!val) {
      recipientAddress = Option.None();
    } else {
      recipientAddress = Option.None();
      recipientAddressError = true;
      pillStore.update({
        text: "Invalid address",
        type: PillTextType.ERROR,
        behavior: PillBehavior.SHAKING_TOP
      });
    }
  };

  const send = async () => {
    // verify that the amount is correct
    let amountToSend = amount.match<number | undefined>({
      None: () => undefined,
      Some: val =>
        !isNaN(val)
          ? val * 10 ** $store.tokens[payload.token].decimals
          : undefined
    });

    if (amountToSend && recipientAddress.isSome()) {
      try {
        const contract = await $store.Tezos.wallet.at(
          $store.tokens[payload.token].address
        );
        // finds if the token is FA1.2 or FA2
        const tokenType = $store.tokens[payload.token].type;
        // creates the parameters of the transactions
        const params: Result<ContractMethodObject<Wallet>[], string> = (() => {
          if (tokenType === "fa1.2") {
            return Result.Ok([
              contract.methodsObject.transfer({
                from: $store.userAddress,
                to: recipientAddress.get(),
                value: amountToSend
              })
            ]);
          } else if (tokenType === "fa2") {
            return Result.Ok([
              contract.methodsObject.transfer([
                {
                  from_: $store.userAddress,
                  txs: [
                    {
                      to_: recipientAddress.get(),
                      token_id: $store.tokens[payload.token].tokenId,
                      amount: amountToSend
                    }
                  ]
                }
              ])
            ]);
          } else {
            return Result.Error("Unknown token type");
          }
        })();
        if (params.isOk()) {
          pillStore.update({
            text: `Sending ${amount.getWithDefault(0)} ${payload.token}`,
            type: PillTextType.TRANSFER_OP,
            newShape: PillShape.LARGE,
            noTimeout: true
          });
          // forges the transaction
          const batch = await prepareOperation({
            contractCalls: params.get(),
            amount: amountToSend / 10 ** $store.tokens[payload.token].decimals,
            tokenSymbol: payload.token
          });
          const op = await batch.send();
          await op.confirmation();
          // waits for confirmation
        } else {
          throw "Unable to prepare the parameters for the transfer operation";
        }
      } catch (error) {
        console.error(error);
        pillStore.update({
          text: `An error has occured`,
          type: PillTextType.ERROR,
          force: true,
          behavior: PillBehavior.SHAKING_TOP
        });
      }
    }
  };
</script>

<style lang="scss">
  img,
  span.material-icons-outlined {
    height: 30px;
    width: 30px;
  }

  .send-tokens__amount,
  .send-tokens__recipient,
  .send-tokens__info {
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
</style>

<div class="modal-header">Send {payload.token} to a user's account</div>
<div class="modal-body">
  <div class="send-tokens__amount">
    <img src={`tokens/${payload.token}.png`} alt="token-logo" />
    <div class="input-with-max">
      <div class="input-container">
        <input
          type="text"
          value={amount.match({ None: () => "", Some: val => val.toString() })}
          on:input={updateAmount}
        />
      </div>
      <button
        class="transparent mini"
        on:click={() => updateAmount({ target: { value: payload.balance } })}
      >
        max ({formatTokenAmount(payload.balance)})
      </button>
    </div>
  </div>
  <div class="send-tokens__recipient">
    <span class="material-icons-outlined"> portrait </span>
    <input
      type="text"
      value={recipientAddress.match({
        None: () => "",
        Some: val => shortenHash(val)
      })}
      on:input={updateRecipientAddress}
      class:error={recipientAddressError}
    />
  </div>
  <div class="send-tokens__info">
    {#if amount.isSome() && amountInXtz.isSome()}
      <span>
        {formatTokenAmount(amount.getWithDefault(0))}
        {payload.token} =
        {amountInXtz.getWithDefault(0)} XTZ =
        {formatTokenAmount(
          amountInXtz.getWithDefault(0) * $store.xtzExchangeRate,
          2
        )}
        {$store.localStorage.getFavoriteFiat().code}
      </span>
    {:else}
      <span>&nbsp;</span>
    {/if}
  </div>
</div>
<div class="modal-footer">
  <div />
  <div class="buttons">
    <button
      class="primary"
      disabled={amount.isNone() && recipientAddress.isNone()}
      on:click={send}
    >
      Send
    </button>
    <button class="error" on:click={() => dispatch("close")}> Close </button>
  </div>
</div>
