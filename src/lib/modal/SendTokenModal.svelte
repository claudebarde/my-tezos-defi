<script lang="ts">
  import { validateAddress } from "@taquito/utils";
  import type { AvailableToken } from "../../types";
  import store from "../../store";
  import { formatTokenAmount, shortenHash } from "../../utils";
  import pillStore, { PillBehavior, PillTextType } from "../pill/pillStore";

  export let payload: { token: AvailableToken; balance: number };

  let amount = "";
  let amountInXtz = "";
  let recipientAddress = "";
  let recipientAddressError = false;

  const updateAmount = ev => {
    const val = ev.target.value;
    if (!isNaN(+val)) {
      amount = val;
      amountInXtz = formatTokenAmount(
        +val * $store.tokens[payload.token].getExchangeRate()
      );
    }
  };

  const updateRecipientAddress = ev => {
    recipientAddressError = false;

    const val = ev.target.value;
    if (validateAddress(val) === 3) {
      recipientAddress = shortenHash(val);
    } else if (!val) {
      recipientAddress = "";
    } else {
      recipientAddressError = true;
      pillStore.update({
        text: "Invalid address",
        type: PillTextType.ERROR,
        behavior: PillBehavior.SHAKING_TOP
      });
    }
  };

  const send = async () => {
    console.log("send tokens");
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
        <input type="text" value={amount} on:input={updateAmount} />
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
      value={recipientAddress}
      on:input={updateRecipientAddress}
      class:error={recipientAddressError}
    />
  </div>
  <div class="send-tokens__info">
    {#if amount && amountInXtz}
      <span>
        {formatTokenAmount(+amount)}
        {payload.token} =
        {amountInXtz} XTZ =
        {formatTokenAmount(+amountInXtz * $store.xtzExchangeRate, 2)}
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
      disabled={!amount || !recipientAddress}
      on:click={send}
    >
      Send
    </button>
    <button class="error"> Close </button>
  </div>
</div>
