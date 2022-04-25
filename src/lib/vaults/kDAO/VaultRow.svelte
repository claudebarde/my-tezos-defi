<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { AsyncData, Result, Option } from "@swan-io/boxed";
  import {
    StableCoinClient,
    HarbingerClient,
    OvenClient,
    Network
  } from "@hover-labs/kolibri-js";
  import type { AvailableVault, TezosContractAddress } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import config from "../../../config";

  export let vault: {
    platform: AvailableVault;
    address: TezosContractAddress;
    xtzLocked: number;
    isLiquidated: boolean;
  };

  const dispatch = createEventDispatcher();
  let balance: AsyncData<Result<string, string>> = AsyncData.NotAsked();
  let stableCoinClient: StableCoinClient;
  let harbingerClient: HarbingerClient;
  let ovenClient: OvenClient;
  let borrowedKusd: number;
  let collateralPercent: number;

  const calcOvenStats = async () => {
    const borrowedTokens = await ovenClient.getBorrowedTokens();
    if (borrowedTokens) {
      borrowedKusd =
        borrowedTokens.toNumber() / 10 ** $store.tokens.kUSD.decimals;
    } else {
      borrowedKusd = undefined;
    }

    balance.match({
      NotAsked: () => undefined,
      Loading: () => undefined,
      Done: blnc =>
        blnc.match({
          Error: () => undefined,
          Ok: blnc => {
            if (!isNaN(+blnc)) {
              // calculates collateral ratio
              const collateralRatio = 1.8;
              const expectedCollateral =
                borrowedKusd + borrowedKusd * collateralRatio;
              const currentCollateral = +blnc * $store.xtzExchangeRate;
              collateralPercent =
                ((currentCollateral - expectedCollateral) /
                  ((expectedCollateral + currentCollateral) / 2)) *
                100;
            }
          }
        })
    });
  };

  onMount(async () => {
    balance = AsyncData.Loading();
    const blnc = await $store.Tezos.tz.getBalance(vault.address);
    if (blnc) {
      balance = AsyncData.Done(Result.Ok(blnc.dividedBy(10 ** 6).toString()));
      dispatch("update-xtz-locked", {
        address: vault.address,
        balance: blnc.toNumber()
      });
      if (!vault.isLiquidated) {
        // inits the Kolibri SDK
        const ovenProxy = await $store.Tezos.wallet.at(
          "KT1JdufSdfg3WyxWJcCRNsBFV9V3x9TQBkJ2"
        );
        const ovenProxyStorage: any = await ovenProxy.storage();
        const { ovenRegistryContractAddress, minterContractAddress } =
          ovenProxyStorage;

        harbingerClient = new HarbingerClient(
          config.rpcUrl,
          "KT1KBrn1udLLrGNbQ3n1mWgMVXkr26krj6Nj"
        );
        stableCoinClient = new StableCoinClient(
          config.rpcUrl,
          Network.Mainnet,
          ovenRegistryContractAddress,
          minterContractAddress,
          "KT1Mgy95DVzqVBNYhsW93cyHuB57Q94UFhrh"
        );
        ovenClient = new OvenClient(
          config.rpcUrl,
          $store.wallet as any,
          vault.address,
          stableCoinClient,
          harbingerClient
        );
        console.log((await ovenClient.getCollateralUtilization()).toNumber());
        await calcOvenStats();
      }
    } else {
      balance = AsyncData.Done(Result.Error("Couldn't fetch the balance"));
    }
  });
</script>

<style lang="scss">
  @import "../../../styles/settings.scss";

  .liquidated {
    background-color: $cyber-yellow;
  }

  .buttons {
    button {
      flex-basis: 40%;
    }
  }

  .collateral-info {
    font-size: 0.7rem;

    &.over {
      color: darken($emerald-green, 15);
    }
    &.under {
      color: $international-orange-aerospace;
    }
  }
</style>

<div class="vault-row" class:liquidated={vault.isLiquidated}>
  <div>
    <a
      href={`https://better-call.dev/mainnet/${vault.address}/operations`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="material-icons-outlined"> open_in_new </span>
    </a>
  </div>
  <div class="icons">
    <img src={`tokens/kDAO.png`} alt="vault-icon" />
    {#if collateralPercent}
      <div
        class="collateral-info"
        class:over={collateralPercent > 9}
        class:under={collateralPercent <= 9}
      >
        <span>
          {collateralPercent > 0 ? "+" : ""}{+collateralPercent.toFixed(2) / 1}%
        </span>
        <br />
        <span> collateral </span>
      </div>
    {/if}
  </div>
  <div class="user-info">
    <div>
      <div>XTZ locked</div>
      <div>
        {@html balance.match({
          NotAsked: () => "",
          Loading: () => "loading...",
          Done: res =>
            res.match({
              Ok: blnc => `<b>${formatTokenAmount(+blnc)} ꜩ</b>`,
              Error: err => err
            })
        })}
      </div>
      <div>
        {balance.match({
          NotAsked: () => "",
          Loading: () => "loading...",
          Done: res =>
            res.match({
              Ok: blnc =>
                formatTokenAmount(+blnc * $store.xtzExchangeRate, 2) + " USD",
              Error: err => err
            })
        })}
      </div>
    </div>
  </div>
  {#if vault.isLiquidated}
    <div>Liquidated</div>
  {:else}
    <div>
      <div>Borrowed</div>
      {#if borrowedKusd}
        <div>
          <b>{formatTokenAmount(borrowedKusd, 3)} kUSD</b>
        </div>
        <div>
          {formatTokenAmount(
            borrowedKusd * $store.tokens.kUSD.getExchangeRate()
          )} ꜩ
        </div>
      {:else}
        <div><span>---</span></div>
        <div>&nbsp;</div>
      {/if}
    </div>
    <div class="buttons">
      <button class="primary mini">Borrow</button>
      <button class="primary mini">Pay back</button>
      <button class="primary mini">Withdraw ꜩ</button>
      <button class="primary mini">Deposit ꜩ</button>
    </div>
  {/if}
</div>
