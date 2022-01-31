<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Modal from "../../Modal/Modal.svelte";
  import store from "../../../store";
  import { InvestmentData, AvailableInvestments } from "../../../types";
  import { formatTokenAmount } from "../../../utils";
  import toastStore from "../../Toast/toastStore";

  export let invData: InvestmentData, type: "stake" | "unstake";

  const dispatch = createEventDispatcher();

  let availableTokensToStake: number | null = null;
  let tokensToStake = "";
  let insuffTokensToStake = false;
  let mtdFee: number | null = null;

  const stake = async () => {
    if (+tokensToStake > 0 && !insuffTokensToStake) {
      // calculates MTD fee
    }
  };

  onMount(async () => {
    // finds available tokens to stake
    const contract = await $store.Tezos.wallet.at(invData.address);
    const storage: any = await contract.storage();
    let tokensAvailable;
    if (invData.id === AvailableInvestments["PAUL-PAUL"]) {
      const stakeTokensContract = await $store.Tezos.wallet.at(
        storage.coin_address
      );
      const stakeTokensStorage: any = await stakeTokensContract.storage();
      tokensAvailable = await stakeTokensStorage.ledger.get($store.userAddress);
    } else {
      const stakeTokensContract = await $store.Tezos.wallet.at(
        storage.pool_address
      );
      const stakeTokensStorage: any = await stakeTokensContract.storage();
      tokensAvailable = await stakeTokensStorage.storage.ledger.get({
        0: $store.userAddress,
        1: storage.token_id.toNumber()
      });
    }

    if (tokensAvailable) {
      availableTokensToStake = tokensAvailable.balance.toNumber();
    } else {
      availableTokensToStake = null;
    }
  });
</script>

<Modal type="default" on:close={() => dispatch("close")}>
  <div slot="modal-title" class="modal-title">
    <div>{type === "stake" ? "Stake" : "Unstake"} in {invData.alias}</div>
    <div>
      <div class="icons">
        {#each invData.icons as icon}
          <img src={`images/${icon}.png`} alt="token-icon" />
        {/each}
      </div>
    </div>
  </div>
  <div slot="modal-body" class="modal-body">
    {#if type === "stake"}
      {#if availableTokensToStake || availableTokensToStake === 0}
        <div class="modal-line">
          <div style="text-align:center">
            Available to stake in this farm:
            <br />
            {formatTokenAmount(availableTokensToStake / 10 ** invData.decimals)}
            {#if invData.id === "PAUL-PAUL"}
              PAUL
            {:else}
              LPT
            {/if}
          </div>
        </div>
        <div class="modal-line">
          <div class="input-with-button" class:error={insuffTokensToStake}>
            <input
              type="text"
              placeholder="Tokens to stake"
              bind:value={tokensToStake}
              on:input={ev => {
                const val = ev.target.value;
                // non numeric values
                if (isNaN(+val)) {
                  tokensToStake = "";
                  mtdFee = null;
                  return;
                }
                // value exceeds the available tokens to stake
                if (+val * 10 ** invData.decimals > availableTokensToStake) {
                  insuffTokensToStake = true;
                  mtdFee = null;
                } else {
                  insuffTokensToStake = false;
                  if (invData.id === "PAUL-PAUL") {
                    mtdFee = formatTokenAmount(
                      +val * $store.serviceFee * $store.tokens.PAUL.exchangeRate
                    );
                  } else {
                    mtdFee = 0.01;
                  }
                }
              }}
            />
            <button
              on:click={() => {
                tokensToStake = (
                  availableTokensToStake /
                  10 ** invData.decimals
                ).toString();
                insuffTokensToStake = false;
                if (invData.id === "PAUL-PAUL") {
                  mtdFee = formatTokenAmount(
                    +tokensToStake *
                      $store.serviceFee *
                      $store.tokens.PAUL.exchangeRate
                  );
                } else {
                  mtdFee = 0.01;
                }
              }}
            >
              Max: {formatTokenAmount(
                availableTokensToStake / 10 ** invData.decimals
              )}
            </button>
          </div>
        </div>
        <div class="modal-line">
          Current stake: {formatTokenAmount(
            invData.balance / 10 ** invData.decimals
          )}
          {invData.id === "PAUL-PAUL" ? "PAUL" : "LPT"}
        </div>
        <div class="modal-line">
          New stake:
          {#if tokensToStake && +tokensToStake > 0 && !insuffTokensToStake}
            {formatTokenAmount(
              invData.balance / 10 ** invData.decimals + +tokensToStake
            )}
            {invData.id === "PAUL-PAUL" ? "PAUL" : "LPT"}
          {:else}
            No change
          {/if}
        </div>
        <div style="font-size:0.7rem">
          {#if mtdFee}
            MTD fee: {mtdFee} XTZ
          {:else}
            &nbsp;
          {/if}
        </div>
      {:else}
        <div class="modal-line">Loading...</div>
      {/if}
    {:else}
      <div class="modal-body__add-stake">Paul unstake</div>
    {/if}
  </div>
  <div slot="modal-footer" class="modal-footer">
    <button
      class="primary"
      on:click={stake}
      disabled={insuffTokensToStake || !tokensToStake}
    >
      Stake
    </button>
    <button class="primary" on:click={() => dispatch("close")}> Close </button>
  </div>
</Modal>
