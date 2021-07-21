<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { bytes2Char } from "@taquito/utils";
  import store from "../store";
  import localStorageStore from "../localStorage";
  import LastOperations from "../lib/LastOperations/LastOperations.svelte";
  import type { Operation, KolibriOvenData } from "../types";
  import { AvailableToken } from "../types";
  import { createNewOpEntry, getKolibriOvens } from "../utils";
  import KolibriOven from "../lib/Tools/KolibriOven.svelte";
  import SendToken from "../lib/Tools/SendToken.svelte";

  export let params;

  let unsupportedToken = false;
  let tokenSymbol: AvailableToken | "XTZ";
  let loading = true;
  const contractCallResponseLimit = 500;
  const days = 1;
  const hours = 2;
  let lastOps: Operation[] = [];
  let kolibriOvens: KolibriOvenData[] = [];
  let storage = undefined;
  let metadata = undefined;
  let tvl = 0;

  onMount(async () => {
    const { tokenSymbol: pTokenSymbol } = params;
    tokenSymbol = pTokenSymbol;

    if (Object.keys($store.tokens).includes(pTokenSymbol)) {
      unsupportedToken = false;
      // loads the contract transaction in the last 24 hours
      let currentLevel = 0;
      if ($store.lastOperations.length === 0) {
        const headResponse = await fetch("https://api.mainnet.tzkt.io/v1/head");
        if (headResponse) {
          const head = await headResponse.json();
          currentLevel = head.level;
        }
      } else {
        currentLevel = $store.lastOperations[0].level;
      }

      if (currentLevel) {
        const lastTxsResponse = await fetch(
          `https://api.mainnet.tzkt.io/v1/operations/transactions?target=${
            $store.tokens[tokenSymbol].address
          }&level.ge=${
            currentLevel - 60 * hours * days
          }&sort.desc=id&limit=${contractCallResponseLimit}`
        );
        if (lastTxsResponse) {
          const unprocessedTxs = await lastTxsResponse.json();
          lastOps = [
            ...unprocessedTxs.map(tx => createNewOpEntry(tx, $store.tokens))
          ];
        }
      }

      if (tokenSymbol === AvailableToken.KUSD) {
        // loads ovens
        const ovens = await getKolibriOvens($store.userAddress, $store.Tezos);
        if (ovens) {
          kolibriOvens = [...ovens];
        }
      }
    } else {
      unsupportedToken = true;
    }
  });

  afterUpdate(async () => {
    if (!$store.tokensExchangeRates[tokenSymbol]) {
      loading = true;
    } else if ($store.tokensExchangeRates[tokenSymbol] && loading) {
      loading = false;
    }

    if (!unsupportedToken && $store.Tezos && storage === undefined) {
      // loads contract storage
      const contract = await $store.Tezos.wallet.at(
        $store.tokens[tokenSymbol].address
      );
      storage = await contract.storage();
      if (storage.hasOwnProperty("metadata")) {
        // checks if contract has metadata
        let mtdt = await storage.metadata.get("");
        mtdt = bytes2Char(mtdt);
        if (mtdt.slice(0, 7) === "ipfs://") {
          // metadata is stored in the IPFS
          const metadataResponse = await fetch(
            `https://cloudflare-ipfs.com/ipfs/${mtdt.slice(7)}`
          );
          if (metadataResponse) {
            metadata = await metadataResponse.json();
          }
        } else if (mtdt.slice(0, 13) === "tezos-storage") {
          // metadata is stored locally
          const metadataKey = mtdt.slice(14);
          const metadataBytes = await storage.metadata.get(metadataKey);
          metadata = JSON.parse(bytes2Char(metadataBytes));
        }
      }
    }

    if ($store.Tezos && tvl === 0) {
      // fetches QuipuSwap TVL
      const dexBalance = await $store.Tezos.tz.getBalance(
        $store.tokens[tokenSymbol].dexContractAddress
      );
      tvl = dexBalance.toNumber() / 10 ** 6;
    }
  });
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .material-icons {
    vertical-align: bottom;
  }

  a {
    text-decoration: none;
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  .container-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;

    & > div {
      padding: 8px;
    }

    .icon {
      img {
        width: 64px;
        height: 64px;
      }
    }

    .prices {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: flex-start;
      gap: 40px;
      text-align: center;
    }
  }

  @media only screen and (max-width: $mobile-break-point) {
    .container-body {
      .prices {
        flex-direction: column;
        gap: 10px;
      }
    }
  }
</style>

<br />
<br />
<div>
  <a href="/#/">
    <span class="material-icons"> arrow_back </span> Back
  </a>
</div>
<br /><br />
{#if unsupportedToken && tokenSymbol !== "XTZ"}
  <div>Unsupported or unknown token</div>
{:else if unsupportedToken && tokenSymbol === "XTZ"}
  <div>Coming soon!</div>
{:else if !unsupportedToken && tokenSymbol}
  <div class="container">
    <div class="title">General</div>
    <div class="container-body">
      <div class="icon">
        <img src={`images/${tokenSymbol}.png`} alt={tokenSymbol} />
      </div>
      <div>
        {#if metadata && metadata.hasOwnProperty("name")}
          {metadata.name}
        {:else}
          {tokenSymbol} Token
        {/if}
      </div>
      <br />
      <div>
        <a
          href={`https://better-call.dev/mainnet/${$store.tokens[tokenSymbol].address}/operations`}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          <span class="material-icons"> receipt_long </span> Token contract
        </a>
      </div>
      {#if tvl > 0}
        <div>TVL: {tvl.toLocaleString("en-US")} ꜩ</div>
      {/if}
      <br />
      {#if $store.tokensExchangeRates[tokenSymbol]}
        <div class="prices">
          <div>
            <div>QuipuSwap Exchange Rate</div>
            <div>
              1 XTZ = {+$store.tokensExchangeRates[
                tokenSymbol
              ].tezToToken.toFixed(5) / 1}
              {tokenSymbol}
            </div>
            <div>
              1 {tokenSymbol} = {+$store.tokensExchangeRates[
                tokenSymbol
              ].tokenToTez.toFixed(5) / 1}
              XTZ
            </div>
          </div>
          <div>
            <div>Real Price</div>
            <div>
              1 XTZ = {+$store.tokensExchangeRates[
                tokenSymbol
              ].realPriceInToken.toFixed(5) / 1}
              {tokenSymbol}
            </div>
            <div>
              1 {tokenSymbol} = {+$store.tokensExchangeRates[
                tokenSymbol
              ].realPriceInTez.toFixed(5) / 1}
              XTZ
            </div>
          </div>
        </div>
      {:else if !$store.tokensExchangeRates[tokenSymbol] && loading}
        <div>Loading...</div>
      {:else}
        <div>No data</div>
      {/if}
      {#if $store.tokensBalances[tokenSymbol]}
        <br />
        <div>
          Balance: {+$store.tokensBalances[tokenSymbol].toFixed(5) / 1}
          {tokenSymbol}
        </div>
        {#if $store.tokensExchangeRates[tokenSymbol]}
          <br />
          <div>
            Total in XTZ: {+(
              +$store.tokensBalances[tokenSymbol] *
              $store.tokensExchangeRates[tokenSymbol].tokenToTez
            ).toFixed(2) / 1} XTZ
          </div>
          <div>
            Total in {$localStorageStore.preferredFiat}: {+(
              +$store.tokensBalances[tokenSymbol] *
              $store.tokensExchangeRates[tokenSymbol].tokenToTez *
              $store.xtzData.exchangeRate
            ).toFixed(2) / 1}
            {$localStorageStore.preferredFiat}
          </div>
        {:else}
          <div>N/A</div>
        {/if}
      {/if}
      <SendToken {tokenSymbol} />
    </div>
  </div>
  <br />
  <br />
  <div class="container">
    <div class="title">Details</div>
    <div class="container-body">
      <div>
        {#if days > 1}
          Contract calls in the last {days} days: {lastOps.length ===
          contractCallResponseLimit
            ? `Over ${contractCallResponseLimit}`
            : lastOps.length}
        {:else}
          Contract calls in the last {hours} hours: {lastOps.length ===
          contractCallResponseLimit
            ? `Over ${contractCallResponseLimit}`
            : lastOps.length}
        {/if}
      </div>
      <div>
        Contract type:
        {#if $store.tokens[tokenSymbol].type === "fa1.2"}
          FA1.2 <span style="font-size:0.6rem">
            <a
              href="https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-7/tzip-7.md"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              (more info)
            </a>
          </span>
        {:else if $store.tokens[tokenSymbol].type === "fa2"}
          FA2 <span style="font-size:0.6rem">
            <a
              href="https://gitlab.com/tzip/tzip/-/blob/master/proposals/tzip-12/tzip-12.md"
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              (more info)
            </a>
          </span>
        {/if}
      </div>
      <!-- STORAGE INFO -->
      {#if storage && storage.hasOwnProperty("total_supply")}
        <div>
          Total supply: {(
            storage.total_supply.toNumber() /
            10 ** $store.tokens[tokenSymbol].decimals
          ).toLocaleString(undefined, { minimumFractionDigits: 5 })} tokens
        </div>
      {:else if storage && storage.hasOwnProperty("totalSupply")}
        <div>
          Total supply: {(
            storage.totalSupply.toNumber() /
            10 ** $store.tokens[tokenSymbol].decimals
          ).toLocaleString(undefined, { minimumFractionDigits: 5 })} tokens
        </div>
      {/if}
      <!-- METADATA INFO -->
      {#if metadata && metadata.hasOwnProperty("homepage")}
        <div>
          Website: <a
            href={metadata.homepage}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {metadata.homepage}
            <span class="material-icons"> open_in_new </span>
          </a>
        </div>
      {/if}
    </div>
  </div>
  <br />
  <br />
  {#if false && tokenSymbol === "kUSD" && kolibriOvens.length > 0 && kolibriOvens.filter(oven => !oven.isLiquidated).length > 0}
    <div class="container">
      <div class="title">Your ovens</div>
      <div class="container-body">
        {#each kolibriOvens as oven}
          {#if !oven.isLiquidated}
            <KolibriOven {oven} />
          {/if}
        {/each}
      </div>
    </div>
    <br />
    <br />
  {/if}
  <LastOperations
    {lastOps}
    filterOps={{ opType: "token", token: tokenSymbol }}
  />
{/if}
