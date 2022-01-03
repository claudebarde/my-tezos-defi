<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Modal from "../../Modal/Modal.svelte";
  import store from "../../../store";
  import type { InvestmentData, AvailableToken } from "../../../types";
  import { formatTokenAmount } from "../../../utils";
  import { estimateLpTokenOutput } from "../../../tokenUtils/plentyUtils";
  import config from "../../../config";
  import toastStore from "../../Toast/toastStore";

  export let invData: InvestmentData;

  const dispatch = createEventDispatcher();

  let tokenAAmount = "";
  let tokenBAmount = "";
  let totalLpTokens = 0;
  let loadingTokenAAmount = false;
  let loadingTokenBAmount = false;
  let tokenAError = false;
  let tokenBError = false;
  let mtdFee: number | null = null;

  // calculates the necessary amount of the second token + LP token output
  const calcLPTvalue = async (val: string, tokenInput: "tokenA" | "tokenB") => {
    tokenAError = false;
    tokenBError = false;

    const tokenVal = +val;
    if (!isNaN(tokenVal)) {
      const dexAddress = config.plentyDexAddresses[invData.id];
      const contract = await $store.Tezos.wallet.at(dexAddress);
      const storage: any = await contract.storage();
      if (tokenInput === "tokenA") {
        tokenAAmount = tokenVal.toString();
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
        tokenBAmount = tokenVal.toString();
        const otherToken =
          (tokenVal *
            10 ** $store.tokens[invData.icons[1]].decimals *
            storage.token1_pool.toNumber()) /
          storage.token2_pool.toNumber() /
          10 ** $store.tokens[invData.icons[0]].decimals;
        tokenAAmount = formatTokenAmount(otherToken, 9).toString();
      }

      if (+tokenAAmount > $store.tokensBalances[invData.icons[0]]) {
        tokenAError = true;
      }
      if (+tokenBAmount > $store.tokensBalances[invData.icons[1]]) {
        tokenBError = true;
      }

      // calculates MTD fee
      mtdFee =
        (invData.icons[0] === "PLENTY" ? +tokenAAmount : +tokenBAmount) *
        2 *
        0.003 *
        $store.tokens.PLENTY.exchangeRate;
    }
    loadingTokenAAmount = false;
    loadingTokenBAmount = false;
  };

  const stake = async () => {
    if (!tokenAAmount || !tokenBAmount || !mtdFee || !totalLpTokens) {
      toastStore.addToast({
        type: "error",
        title: "Unable to stake",
        text: "One of the required values is missing",
        dismissable: true
      });
      return;
    }

    const [tokenA, tokenB] = invData.icons as [AvailableToken, AvailableToken];
    const dexAddressVal = Object.entries(config.plentyDexAddresses).find(val =>
      val[0].includes(`${tokenA}-${tokenB}`)
    );
    const lpTokenAddressVal = Object.entries(config.plentyLptAddresses).find(
      val => val[0].includes(`${tokenA}-${tokenB}`)
    );
    if (
      Object.keys($store.tokens).includes(tokenA) &&
      Object.keys($store.tokens).includes(tokenB) &&
      dexAddressVal &&
      lpTokenAddressVal
    ) {
      const dexAddress = dexAddressVal[1];
      const lpTokenAddress = lpTokenAddressVal[1];
      try {
        let batch = $store.Tezos.wallet.batch();
        // forges transaction to approve LP contract as an operator for tokenA and tokenB
        const contractForTokenA = await $store.Tezos.wallet.at(
          $store.tokens[tokenA].address
        );
        if ($store.tokens[tokenA].type === "fa1.2") {
          batch = batch.withContractCall(
            contractForTokenA.methods.approve(
              dexAddress,
              +tokenAAmount * 10 ** $store.tokens[tokenA].decimals
            )
          );
        } else if ($store.tokens[tokenA].type === "fa2") {
          batch = batch.withContractCall(
            contractForTokenA.methods.update_operators([
              {
                add_operator: {
                  owner: $store.userAddress,
                  operator: dexAddress,
                  token_id: $store.tokens[tokenA].tokenId
                }
              }
            ])
          );
        }
        const contractForTokenB = await $store.Tezos.wallet.at(
          $store.tokens[tokenB].address
        );
        if ($store.tokens[tokenB].type === "fa1.2") {
          batch = batch.withContractCall(
            contractForTokenB.methods.approve(
              dexAddress,
              +tokenBAmount * 10 ** $store.tokens[tokenB].decimals
            )
          );
        } else if ($store.tokens[tokenB].type === "fa2") {
          batch = batch.withContractCall(
            contractForTokenB.methods.update_operators([
              {
                add_operator: {
                  owner: $store.userAddress,
                  operator: dexAddress,
                  token_id: $store.tokens[tokenB].tokenId
                }
              }
            ])
          );
        }
        // forges transaction to get LP tokens
        const dexContract = await $store.Tezos.wallet.at(dexAddress);
        batch = batch.withContractCall(
          dexContract.methods.AddLiquidity(
            $store.userAddress,
            +tokenAAmount * 10 ** $store.tokens[tokenA].decimals,
            +tokenBAmount * 10 ** $store.tokens[tokenB].decimals
          )
        );
        // forges transaction to approve farm as an operator for LP tokens
        const lpTokenContract = await $store.Tezos.wallet.at(lpTokenAddress);
        batch = batch.withContractCall(
          lpTokenContract.methods.approve(
            invData.address,
            totalLpTokens * 10 ** invData.decimals
          )
        );
        // forges transaction to stake the LP tokens
        const farmContract = await $store.Tezos.wallet.at(invData.address);
        batch = batch.withContractCall(
          farmContract.methods.stake(totalLpTokens * 10 ** invData.decimals)
        );
        // forges transaction to deduct MTD fee
        batch = batch.withTransfer({
          to: $store.admin,
          amount: Math.ceil(mtdFee * 10 ** 6),
          mutez: true
        });
        // sends transaction
        const batchOp = await batch.send();
        await batchOp.confirmation();
      } catch (error) {
        console.error(error);
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
          <img
            src={`images/${icon}.png`}
            alt="token-icon"
            class:loading={index === 0
              ? loadingTokenAAmount
              : loadingTokenBAmount}
          />
          <div>
            {#if index === 0}
              <input
                type="text"
                value={tokenAAmount}
                style={tokenAError ? `color:red` : ""}
                on:input={ev => {
                  loadingTokenBAmount = true;
                  calcLPTvalue(ev.target.value, "tokenA");
                }}
              />
            {:else}
              <input
                type="text"
                value={tokenBAmount}
                style={tokenBError ? `color:red` : ""}
                on:input={ev => {
                  loadingTokenAAmount = true;
                  calcLPTvalue(ev.target.value, "tokenB");
                }}
              />
            {/if}
            <button
              class="modal-body__add-stake__available-balance"
              on:click={() => {
                if (index === 0) {
                  loadingTokenBAmount = true;
                  tokenAAmount = $store.tokensBalances[icon];
                  calcLPTvalue(tokenAAmount, "tokenA");
                } else {
                  loadingTokenAAmount = true;
                  tokenBAmount = $store.tokensBalances[icon];
                  calcLPTvalue(tokenBAmount, "tokenB");
                }
              }}
            >
              Max: {formatTokenAmount($store.tokensBalances[icon])}
              {icon}
            </button>
          </div>
        </div>
      {/each}
      <div>Total LP tokens: {totalLpTokens}</div>
      <div style="font-size:0.8rem">
        {#if mtdFee}
          MTD fee: {formatTokenAmount(mtdFee)} XTZ
        {/if}
      </div>
    </div>
  </div>
  <div slot="modal-footer" class="modal-footer">
    <button class="primary" on:click={stake}>Stake</button>
    <button class="primary" on:click={() => dispatch("close")}> Close </button>
  </div>
</Modal>
