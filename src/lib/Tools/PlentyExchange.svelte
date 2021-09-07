<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { findDex, estimateSwap } from "@quipuswap/sdk";
  import store from "../../store";
  import config from "../../config";
  import { AvailableToken } from "../../types";
  import SelectBox from "./SelectBox.svelte";

  let loading = true;
  let currentLevel = 0;
  let availableTokens: AvailableToken[] = [
    AvailableToken.PLENTY,
    AvailableToken.USDTZ,
    AvailableToken.wUSDC,
    AvailableToken.wBUSD,
    AvailableToken.wLINK,
    AvailableToken.wMATIC,
    AvailableToken.WWBTC
  ];
  let selectedPair: [AvailableToken, AvailableToken] = [
    AvailableToken.PLENTY,
    AvailableToken.USDTZ
  ];
  let fromVal = 1;
  let toVal = 1;
  let quipuswapResult: null | number = null; // PLENTY to token value
  let plentyswapResult: null | number = null; // PLENTY to token value

  const fetchQuipuswapRate = async () => {
    const fromToken = {
      contract: $store.tokens[selectedPair[0]].address,
      id: $store.tokens[selectedPair[0]].tokenId
    };
    const toToken = {
      contract: $store.tokens[selectedPair[1]].address,
      id: $store.tokens[selectedPair[1]].tokenId
    };
    const dex = await findDex(
      $store.Tezos,
      config.quipuswapFactories,
      fromToken
    );
    if (dex) {
      const estimatedSwap = await estimateSwap(
        $store.Tezos,
        config.quipuswapFactories,
        fromToken,
        toToken,
        {
          inputValue: fromVal * 10 ** $store.tokens[selectedPair[0]].decimals
        }
      );
      if (estimatedSwap) {
        quipuswapResult =
          estimatedSwap.toNumber() /
          10 ** $store.tokens[selectedPair[1]].decimals;
      } else {
        quipuswapResult = null;
      }
    } else {
      quipuswapResult = null;
    }
  };

  const fetchPlentyswapRate = async (
    dexAddress: string,
    token1decimals,
    token2decimals
  ) => {
    const contract = await $store.Tezos.wallet.at(dexAddress);
    const storage: any = await (await contract).storage();
    const token1 = storage.token1_pool.toNumber() / 10 ** token1decimals;
    const token2 = storage.token2_pool.toNumber() / 10 ** token2decimals;
    const result = token2 / token1;
    const resultMinusPlentyFee = result - (result * 0.1) / 100;
    const resultMinusLiquidityProviderFee =
      resultMinusPlentyFee - (resultMinusPlentyFee * 0.25) / 100;

    plentyswapResult = resultMinusLiquidityProviderFee;
  };

  const updateTokens = (dir: "from" | "to", token: AvailableToken) => {
    console.log(dir, token);
    if (dir === "from" && token !== AvailableToken.PLENTY) {
      // token to must become PLENTY
      selectedPair = [token, AvailableToken.PLENTY];
    } else if (dir === "to" && token !== AvailableToken.PLENTY) {
      // token from must become PLENTY
      selectedPair = [AvailableToken.PLENTY, token];
    }
  };

  onMount(async () => {
    try {
      // fetches QuipuSwap rates for the current selected pair
      await fetchQuipuswapRate();
      await fetchPlentyswapRate(
        config.plentyDexAddresses["PLENTY-USDtz"],
        18,
        6
      );
    } catch (error) {
      console.error(error);
      quipuswapResult = null;
      plentyswapResult = null;
    } finally {
      loading = false;
      if (
        $store.lastOperations.length > 0 &&
        $store.lastOperations[0].level !== currentLevel
      ) {
        currentLevel = $store.lastOperations[0].level;
      }
    }
  });

  afterUpdate(async () => {
    if (
      !loading &&
      $store &&
      $store.Tezos &&
      $store.lastOperations.length > 0 &&
      $store.lastOperations[0].level !== currentLevel
    ) {
      currentLevel = $store.lastOperations[0].level;
      try {
        // fetches QuipuSwap rates for the current selected pair
        await fetchQuipuswapRate();
        // fetches QuipuSwap rates for the current selected pair
        const dexId = `${selectedPair[0]}-${selectedPair[1]}`;
        if (config.plentyDexAddresses.hasOwnProperty(dexId)) {
          await fetchPlentyswapRate(
            config.plentyDexAddresses[dexId],
            $store.tokens[selectedPair[0]].decimals,
            $store.tokens[selectedPair[1]].decimals
          );
        }
      } catch (error) {
        console.error(error);
        quipuswapResult = null;
      }
    }
  });
</script>

<style lang="scss">
  .plenty-exchange-container {
    padding: 15px;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .input-field {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>

<div class="plenty-exchange-container">
  {#if loading}
    Loading...
  {:else}
    <div class="input-field">
      <input type="text" bind:value={fromVal} />
      <SelectBox
        options={availableTokens.map(tk => ({ icons: [tk], name: tk }))}
        selected={selectedPair[0]}
        displaySelection={true}
        on:new-selection={e => updateTokens("from", e.detail)}
      />
      &nbsp;&nbsp;
      <span class="material-icons"> keyboard_double_arrow_right </span>
      &nbsp;&nbsp;
      <SelectBox
        options={availableTokens.map(tk => ({ icons: [tk], name: tk }))}
        selected={selectedPair[1]}
        displaySelection={true}
        on:new-selection={e => updateTokens("to", e.detail)}
      />
    </div>
    <br />
    <div>
      On QuipuSwap:
      {#if quipuswapResult}
        {fromVal}
        {selectedPair[0]} = {quipuswapResult.toFixed(6)}
        {selectedPair[1]}
      {:else}
        No data
      {/if}
    </div>
    <br />
    <div>
      On PlentySwap:
      {#if plentyswapResult}
        {fromVal}
        {selectedPair[0]} = {plentyswapResult.toFixed(6)}
        {selectedPair[1]}
      {:else}
        No data
      {/if}
    </div>
  {/if}
</div>
