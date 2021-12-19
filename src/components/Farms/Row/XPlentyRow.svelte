<script lang="ts">
  import { onMount } from "svelte";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import { getExpectedPlenty } from "../../../tokenUtils/plentyUtils";
  import localStorageStore from "../../../localStorage";
  import config from "../../../config";

  let expectedPlentyTokens: null | number = null;
  let xPlentyExchangeRate: null | number = null;

  onMount(async () => {
    const contract = await $store.Tezos.wallet.at(
      $store.investments["xPLENTY-Staking"].address
    );
    const storage: any = await contract.storage();
    const balance = await storage.balances.get($store.userAddress);
    if (balance) {
      store.updateInvestments({
        ...$store.investments,
        "xPLENTY-Staking": {
          ...$store.investments["xPLENTY-Staking"],
          balance: formatTokenAmount(
            balance.toNumber() / 10 ** $store.tokens.xPLENTY.decimals
          )
        }
      });

      xPlentyExchangeRate = await getExpectedPlenty(
        $store.Tezos,
        10 ** $store.tokens.xPLENTY.decimals,
        $store.currentLevel
      );
      expectedPlentyTokens =
        (balance.toNumber() / 10 ** $store.tokens.xPLENTY.decimals) *
        (xPlentyExchangeRate / 10 ** $store.tokens.PLENTY.decimals);
    } else {
      store.updateInvestments({
        ...$store.investments,
        "xPLENTY-Staking": {
          ...$store.investments["xPLENTY-Staking"],
          balance: 0
        }
      });
    }
  });
</script>

<div class="farm-block">
  <div class="farm-block__name">
    <div style="text-align:center">
      <div class="icons">
        <img src={`images/xPLENTY.png`} alt="token-icon" />
      </div>
      <div>
        <a
          href={`https://better-call.dev/mainnet/${$store.investments["xPLENTY-Staking"].address}/operations`}
          target="_blank"
          rel="noopener noreferrer nofollow"
        >
          {$store.investments["xPLENTY-Staking"].alias}
        </a>
      </div>
    </div>
    {#if xPlentyExchangeRate}
      <div>
        <div style="font-size:0.7rem">
          1 xPLENTY = {formatTokenAmount(
            xPlentyExchangeRate / 10 ** $store.tokens.PLENTY.decimals
          )} PLENTY
        </div>
        <div style="font-size:0.7rem">
          1 PLENTY = {formatTokenAmount(
            1 / (xPlentyExchangeRate / 10 ** $store.tokens.PLENTY.decimals)
          )} xPLENTY
        </div>
      </div>
    {/if}
  </div>
  <div class="farm-block__data">
    <div class="farm-block__data__info">
      <span class="title">Stake:</span>
      <br />
      <div class:blurry-text={$store.blurryBalances}>
        {formatTokenAmount($store.investments["xPLENTY-Staking"].balance)} xPLENTY
      </div>
      <br />
      <span class="title">Stake in XTZ:</span>
      <br />
      {#if expectedPlentyTokens}
        <div class:blurry-text={$store.blurryBalances}>
          {formatTokenAmount(
            expectedPlentyTokens *
              10 ** $store.tokens.PLENTY.exchangeRate *
              $store.tokens.PLENTY.exchangeRate
          )} ꜩ
        </div>
      {:else}
        <div>N/A</div>
      {/if}
      <br />
      <span class="title">Stake in {$localStorageStore.preferredFiat}:</span>
      <br />
      {#if expectedPlentyTokens}
        <div class:blurry-text={$store.blurryBalances}>
          {formatTokenAmount(
            expectedPlentyTokens *
              10 ** $store.tokens.PLENTY.exchangeRate *
              $store.tokens.PLENTY.exchangeRate *
              $store.xtzData.exchangeRate
          )}
          {config.validFiats.find(
            fiat => fiat.code === $localStorageStore.preferredFiat
          ).symbol}
        </div>
      {:else}
        <div>N/A</div>
      {/if}
    </div>
  </div>
  <div class="farm-block__actions">
    <div class="buttons stack">
      <button class="primary" id="xplenty-stake-button">
        Stake &nbsp;
        <span class="material-icons"> file_download </span>
      </button>
      <button class="primary" id="xplenty-unstake-button">
        Unstake &nbsp;
        <span class="material-icons"> file_upload </span>
      </button>
    </div>
  </div>
</div>
