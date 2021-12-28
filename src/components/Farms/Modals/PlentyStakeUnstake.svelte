<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "../../Modal/Modal.svelte";
  import store from "../../../store";
  import type { InvestmentData, IconValue } from "../../../types";
  import { formatTokenAmount } from "../../../utils";
  import { getPlentyLqtValue } from "../../../tokenUtils/plentyUtils";
  import config from "../../../config";

  export let invData: InvestmentData;

  const dispatch = createEventDispatcher();

  let tokenAAmount = "";
  let tokenBAmount = "";

  // calculates the necessary amount of the second token + LP token output
  const calcLPTvalue = async (val: string, tokenInput: "tokenA" | "tokenB") => {
    const tokenVal = +val;
    if (!isNaN(tokenVal)) {
      console.log(tokenVal, tokenInput);
      const pricesForOneLPtoken = await getPlentyLqtValue(
        invData.id,
        config.plentyDexAddresses[invData.id],
        1,
        $store.Tezos
      );
      if (pricesForOneLPtoken) {
        console.log(pricesForOneLPtoken);
        const { token1Amount, token2Amount } = pricesForOneLPtoken;
        if (tokenInput === "tokenA") {
          tokenBAmount = formatTokenAmount(
            (tokenVal / token1Amount) * token2Amount
          ).toString();
        }
      }
    }
  };
</script>

<Modal type="default" on:close={() => dispatch("close")}>
  <div slot="modal-title" class="modal-title">
    <div>Add stake in {invData.alias}</div>
    <div>
      <div class="icons">
        {#each invData.icons as icon}
          <img src={`images/${icon}.png`} alt="token-icon" />
        {/each}
      </div>
    </div>
  </div>
  <div slot="modal-body" class="modal-body">
    <div class="modal-body__add-stake">
      {#each invData.icons as icon, index}
        <div class="modal-body__add-stake__input">
          <img src={`images/${icon}.png`} alt="token-icon" />
          <div>
            {#if index === 0}
              <input
                type="text"
                value={tokenAAmount}
                on:input={ev => calcLPTvalue(ev.target.value, "tokenA")}
              />
            {:else}
              <input
                type="text"
                value={tokenBAmount}
                on:input={ev => calcLPTvalue(ev.target.value, "tokenB")}
              />
            {/if}
            <div class="modal-body__add-stake__available-balance">
              Max: {formatTokenAmount($store.tokensBalances[icon])}
              {icon}
            </div>
          </div>
        </div>
      {/each}
      <div>Total LP tokens: 0</div>
    </div>
  </div>
  <div slot="modal-footer" class="modal-footer">
    <button class="primary">Stake</button>
    <button class="primary" on:click={() => dispatch("close")}> Close </button>
  </div>
</Modal>
