<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import { calcTotalShareValueInTez, getPlentyReward } from "../../utils";
  import ManagePlenty from "../Modal/ManagePlenty.svelte";

  export let data, platform, valueInXtz;

  let lastLevel = 0;
  let loadingPlentyRewards = false;
  let plentyRewards = "--";

  afterUpdate(async () => {
    // loads PLENTY rewards
    if (lastLevel !== $store.lastOperations[0].level && !loadingPlentyRewards) {
      loadingPlentyRewards = true;
      let level = $store.lastOperations[0].level;

      const rewards = await getPlentyReward(
        $store.userAddress,
        data.address[$store.network],
        level,
        data.decimals
      );
      if (rewards.status) {
        if (rewards.totalRewards === 0) {
          plentyRewards = "0";
        } else {
          plentyRewards = rewards.totalRewards.toFixed(5);
        }
      } else {
        plentyRewards = "N/A";
      }

      lastLevel = level;
      loadingPlentyRewards = false;
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .row {
    display: grid;
    grid-template-columns: 10% 25% 20% 17% 17% 11%;
    padding: 5px 10px;
    align-items: center;

    a {
      color: inherit;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .icon {
      img {
        width: 25px;
        height: 25px;
      }
    }
  }
</style>

<div class="row">
  {#if platform === "quipuswap" || platform === "plenty"}
    <div class="icon">
      {#each data.icons as icon}
        <img src={`images/${icon}.png`} alt="token-icon" />
      {/each}
    </div>
    <div>
      <a
        href={`https://better-call.dev/mainnet/${
          data.address[$store.network]
        }/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {data.alias}
      </a>
    </div>
    <div>{data.balance / 10 ** data.decimals}</div>
  {/if}
  {#if platform === "quipuswap"}
    <div>--</div>
    <div>--</div>
  {:else if platform === "plenty"}
    <!-- PLENTY -->
    {#if data.alias !== "PLENTY-XTZ LP farm" && $store.tokensExchangeRates[data.token]}
      <div>
        {#if valueInXtz}
          <span>
            {+(
              (data.balance / 10 ** data.decimals) *
              $store.tokensExchangeRates[data.token].tokenToTez
            ).toFixed(5) / 1}
          </span>
        {:else}
          <span>
            {(
              +(
                ((data.balance / 10 ** data.decimals) *
                  $store.tokensExchangeRates[data.token].tokenToTez) /
                1
              ) * $store.xtzData.exchangeRate
            ).toFixed(5)}
          </span>
        {/if}
      </div>
    {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
      <div>
        {#if valueInXtz}
          <span>
            {+calcTotalShareValueInTez(
              data.balance,
              data.shareValueInTez,
              $store.tokensExchangeRates.PLENTY.tokenToTez,
              $store.tokens.PLENTY.decimals
            ).toFixed(5) / 1}
          </span>
        {:else}
          <span>
            {(
              +(
                calcTotalShareValueInTez(
                  data.balance,
                  data.shareValueInTez,
                  $store.tokensExchangeRates.PLENTY.tokenToTez,
                  $store.tokens.PLENTY.decimals
                ) / 1
              ) * $store.xtzData.exchangeRate
            ).toFixed(5)}
          </span>
        {/if}
      </div>
    {:else}
      <div>--</div>
    {/if}
    <div>
      {#if loadingPlentyRewards}
        Calculating...
      {:else}
        {plentyRewards}
      {/if}
    </div>
    <div>
      <ManagePlenty
        contractAddress={data.address[$store.network]}
        alias={data.alias}
        id={data.id}
      />
    </div>
  {:else if platform === "crunchy"}
    <!-- CRUNCHY FARMS have a zero balance but data in the info array -->
    {#each data.info as farm}
      {#if farm.farmId < 3}
        <div class="icon">
          {#if farm.farmId == 0}
            <img src="images/XTZ.png" alt="token-icon" />
            <img src="images/CRUNCH.png" alt="token-icon" />
          {:else if farm.farmId == 1}
            <img src="images/XTZ.png" alt="token-icon" />
            <img src="images/kUSD.png" alt="token-icon" />
          {:else if farm.farmId == 2}
            <img src="images/XTZ.png" alt="token-icon" />
            <img src="images/wWBTC.png" alt="token-icon" />
          {:else}
            <img src="images/crDAO.png" alt="token-icon" />
          {/if}
        </div>
        <div>
          <a
            href={`https://better-call.dev/mainnet/${
              data.address[$store.network]
            }/operations`}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {#if farm.farmId == 0}
              Crunchy Farm XTZ/CRUNCH
            {:else if farm.farmId == 1}
              Crunchy Farm XTZ/kUSD
            {:else if farm.farmId == 2}
              Crunchy Farm XTZ/wWBTC
            {:else}
              {data.alias}
            {/if}
          </a>
        </div>
        <div>{farm.amount / 10 ** data.decimals}</div>
        <div>
          {#if farm.farmId == 0 && $store.tokensExchangeRates.CRUNCH}
            {+calcTotalShareValueInTez(
              farm.amount,
              farm.shareValueInTez,
              $store.tokensExchangeRates.CRUNCH.tokenToTez,
              $store.tokens.CRUNCH.decimals
            ).toFixed(5) / 1}
          {:else if farm.farmId == 1 && $store.tokensExchangeRates.kUSD}
            {+calcTotalShareValueInTez(
              farm.amount,
              farm.shareValueInTez,
              $store.tokensExchangeRates.KUSD.tokenToTez,
              $store.tokens.KUSD.decimals
            ).toFixed(5) / 1}
          {:else if farm.farmId == 2 && $store.tokensExchangeRates.wWBTC}
            {+calcTotalShareValueInTez(
              farm.amount,
              farm.shareValueInTez,
              $store.tokensExchangeRates.wWBTC.tokenToTez,
              $store.tokens.wWBTC.decimals
            ).toFixed(5) / 1}
          {:else}
            --
          {/if}
        </div>
        <div>--</div>
      {/if}
    {/each}
  {/if}
</div>
