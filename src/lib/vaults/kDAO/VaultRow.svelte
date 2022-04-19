<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import { AsyncData, Result } from "@swan-io/boxed";
  import type { AvailableVault, TezosContractAddress } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";

  export let vault: {
    platform: AvailableVault;
    address: TezosContractAddress;
    xtzLocked: number;
    isLiquidated: boolean;
  };

  const dispatch = createEventDispatcher();
  let balance: AsyncData<Result<string, string>> = AsyncData.NotAsked();

  onMount(async () => {
    balance = AsyncData.Loading();
    const blnc = await $store.Tezos.tz.getBalance(vault.address);
    if (blnc) {
      balance = AsyncData.Done(Result.Ok(blnc.dividedBy(10 ** 6).toString()));
      dispatch("update-xtz-locked", {
        address: vault.address,
        balance: blnc.toNumber()
      });
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
    <div>slot 2</div>
    <div class="buttons">button</div>
    <div>button</div>
  {/if}
</div>
