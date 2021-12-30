<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "../../Modal/Modal.svelte";
  import store from "../../../store";
  import type { InvestmentData } from "../../../types";
  import { formatTokenAmount } from "../../../utils";
  import {
    estimateLpTokenOutput,
    formatPlentyLpAmount
  } from "../../../tokenUtils/plentyUtils";
  import config from "../../../config";

  export let invData: InvestmentData;

  const dispatch = createEventDispatcher();

  let tokenAAmount = "";
  let tokenBAmount = "";
  let totalLpTokens = 0;

  // calculates the necessary amount of the second token + LP token output
  const calcLPTvalue = async (val: string, tokenInput: "tokenA" | "tokenB") => {
    const tokenVal = +val;
    if (!isNaN(tokenVal)) {
      const dexAddress = config.plentyDexAddresses[invData.id];
      const contract = await $store.Tezos.wallet.at(dexAddress);
      const storage: any = await contract.storage();
      if (tokenInput === "tokenA") {
        // value from first input
        const otherToken =
          (tokenVal *
            10 ** $store.tokens[invData.icons[0]].decimals *
            storage.token2_pool.toNumber()) /
          storage.token1_pool.toNumber() /
          10 ** $store.tokens[invData.icons[1]].decimals;
        tokenBAmount = formatTokenAmount(otherToken, 9).toString();
        const estimatedLptOutput = estimateLpTokenOutput({
          tokenIn_amount:
            tokenVal * 10 ** $store.tokens[invData.icons[0]].decimals,
          tokenOut_amount:
            otherToken * 10 ** $store.tokens[invData.icons[1]].decimals,
          tokenIn_supply: storage.token1_pool.toNumber(),
          tokenOut_supply: storage.token2_pool.toNumber(),
          lpTokenSupply: storage.totalSupply
        });
        totalLpTokens = formatTokenAmount(
          estimatedLptOutput / 10 ** invData.decimals
        );
      } else {
        // value from second input
        const otherToken =
          (tokenVal *
            10 ** $store.tokens[invData.icons[1]].decimals *
            storage.token1_pool.toNumber()) /
          storage.token2_pool.toNumber() /
          10 ** $store.tokens[invData.icons[0]].decimals;
        tokenAAmount = formatTokenAmount(otherToken, 9).toString();
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
      <div>Total LP tokens: {totalLpTokens}</div>
    </div>
  </div>
  <div slot="modal-footer" class="modal-footer">
    <button class="primary">Stake</button>
    <button class="primary" on:click={() => dispatch("close")}> Close </button>
  </div>
</Modal>
