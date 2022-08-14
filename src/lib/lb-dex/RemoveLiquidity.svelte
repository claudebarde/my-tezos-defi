<script lang="ts">
  import { onMount } from "svelte";
  import { AsyncData, Option } from "@swan-io/boxed";
  import store from "../../store";
  import { formatTokenAmount } from "../../utils";
  import config from "../../config";
  import type BigNumber from "bignumber.js";
  import { removeLiquidityXtzTzbtcOut } from "./lbUtils";

  let lqtError = false;
  let lqtValue: number = undefined;
  let lqtBalance = AsyncData.NotAsked<Option<number>>();
  let xtzOut = 0;
  let tzbtcOut = 0;

  const updateLqtValue = () => {
    if (!!lqtValue && !isNaN(lqtValue) && lqtValue > 0) {
      lqtBalance.match({
        Done: val =>
          val.match({
            Some: blnc => {
              lqtError = lqtValue > blnc;
              const res = removeLiquidityXtzTzbtcOut({
                liquidityBurned: lqtValue,
                totalLiquidity: $store.lbData.lqtTotal,
                xtzPool: $store.lbData.xtzPool,
                tzbtcPool: $store.lbData.tokenPool
              });
              if (res) {
                xtzOut = res.xtzOut.toNumber() / 10 ** 6;
                tzbtcOut =
                  res.tzbtcOut.toNumber() / 10 ** $store.tokens.tzBTC.decimals;
              }
            },
            None: () => {
              lqtError = false;
            }
          }),
        Loading: () => undefined,
        NotAsked: () => undefined
      });
    } else {
      lqtValue = undefined;
      xtzOut = 0;
      tzbtcOut = 0;
    }
  };

  onMount(async () => {
    // fetches the user's SIRS balance
    lqtBalance = AsyncData.Loading();
    if ($store.userAddress) {
      const contract = await $store.Tezos.wallet.at(config.lqtContractAddress);
      const storage: any = await contract.storage();
      const balance: BigNumber | undefined = await storage.tokens.get(
        $store.userAddress
      );
      if (balance) {
        lqtBalance = AsyncData.Done(Option.Some(balance.toNumber()));
      } else {
        lqtBalance = AsyncData.Done(Option.None());
      }
    }
  });
</script>

<div class="lb-form">
  <div class="form-input">
    <label for="xtz-input" class:error={lqtError}>
      <div class="input-token">
        <img src="tokens/SIRS.png" alt="sirius-token" />
      </div>
      <div class="input-value">
        <input
          type="number"
          id="xtz-input"
          bind:value={lqtValue}
          on:input={updateLqtValue}
          on:focus={() => {
            if (lqtValue === 0) lqtValue = null;
          }}
        />
      </div>
      <div
        class="input-token-balance"
        style="cursor:pointer"
        on:click={() => {
          if (lqtBalance.isDone()) {
            lqtValue = lqtBalance.getWithDefault(undefined).match({
              None: () => 0,
              Some: val => val
            });
            updateLqtValue();
          }
        }}
      >
        <p>Balance</p>
        <p>
          {lqtBalance.match({
            NotAsked: () => "N/A",
            Loading: () => "loading...",
            Done: val =>
              val.match({
                None: () => "0 SIRS",
                Some: val => `${val} SIRS`
              })
          })}
        </p>
      </div>
    </label>
  </div>
  <div class="remove-info">
    <div>
      <p>XTZ value</p>
      <p>{formatTokenAmount(xtzOut)}</p>
    </div>
    <div>
      <p>tzBTC value</p>
      <p>{formatTokenAmount(tzbtcOut, 8)}</p>
    </div>
  </div>
  <button class="primary" disabled={lqtError || !lqtBalance.isDone()}>
    Remove
  </button>
</div>
