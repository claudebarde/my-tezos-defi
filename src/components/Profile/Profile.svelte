<script lang="ts">
  import { onMount } from "svelte";
  import {
    fetchTezosDomain,
    shortenHash,
    searchUserTokens,
    formatTokenAmount,
    loadInvestments
  } from "../../utils";
  import { calcPlentyStakeInXtz } from "../../tokenUtils/plentyUtils";
  import {
    calcTokenStakesInAlienFarm,
    calcTokenStakesFromQuipu
  } from "../../tokenUtils/paulUtils";
  import { calcTokenStakesInWrapFarms } from "../../tokenUtils/wrapUtils";
  import store from "../../store";
  import { AvailableToken, AvailableInvestments } from "../../types";

  export let params;

  let noUser = false;
  let username = "";
  let xtzBalance: null | string = null;
  let loadingUserTokens = true;
  let loadingUserFarms = true;
  let userTokens: { id: AvailableToken; balance: number }[] = [];
  let investments: {
    id: AvailableInvestments;
    balance: number;
    stakeInXtz: null | number;
  }[] = [];
  let shareLinkState: "idle" | "clicked" = "idle";

  onMount(async () => {
    const { useraddress: userAddress } = params;
    if (!userAddress) {
      noUser = true;
      return;
    }

    username = shortenHash(userAddress);
    username = await fetchTezosDomain($store.Tezos, userAddress);

    // finds user's XTZ balance
    const balance = await $store.Tezos.tz.getBalance(userAddress);
    if (balance) {
      xtzBalance = formatTokenAmount(
        balance.toNumber() / 10 ** 6,
        2
      ).toString();
    } else {
      xtzBalance = "N/A";
    }
    // finds user's tokens
    const tokensResponse = await searchUserTokens({
      Tezos: $store.Tezos,
      userAddress,
      tokens: Object.entries($store.tokens)
    });
    if (tokensResponse) {
      userTokens = Object.entries(tokensResponse)
        .filter(
          ([_, balance]) =>
            +balance.toLocaleString("fullwide", { useGrouping: false }) > 0
        )
        .map(([id, balance]) => ({ id: id as AvailableToken, balance }))
        .sort((a, b) => b.balance - a.balance);
      if (userTokens && userTokens.length > 0) {
        loadingUserTokens = false;
      }
    }

    // finds user's investments
    const investmentsRes = await loadInvestments(
      [...Object.values(AvailableInvestments)],
      userAddress
    );
    const investmentsStakeInXtz = await Promise.allSettled(
      investmentsRes
        .filter(
          res =>
            res.status === "fulfilled" && !!res.value && res.value.balance > 0
        )
        .map(async (res: PromiseFulfilledResult<any>) => {
          const invData = $store.investments[res.value.id];

          if (invData.platform === "plenty") {
            const stakeInXtz = await calcPlentyStakeInXtz({
              id: res.value.id,
              isPlentyLpToken: invData.liquidityToken,
              balance: res.value.balance,
              decimals: invData.decimals,
              exchangeRate: $store.tokens.PLENTY.exchangeRate,
              rewardToken: invData.rewardToken
            });
            return {
              id: res.value.id,
              balance: res.value.balance,
              stakeInXtz
            };
          } else if (invData.platform === "paul") {
            if (invData.info.includes("paul-lqt")) {
              const { tokenAAmount, tokenBAmount } =
                await calcTokenStakesInAlienFarm({
                  Tezos: $store.Tezos,
                  amountOfTokens: res.value.balance,
                  tokens: [
                    {
                      address: $store.tokens[invData.icons[0]].address,
                      tokenId: $store.tokens[invData.icons[0]].tokenId,
                      tokenType: $store.tokens[invData.icons[0]].type
                    },
                    {
                      address: $store.tokens[invData.icons[1]].address,
                      tokenId: $store.tokens[invData.icons[1]].tokenId,
                      tokenType: $store.tokens[invData.icons[1]].type
                    }
                  ]
                });
              const token1InXtz =
                ((tokenAAmount /
                  10 ** $store.tokens[invData.icons[0]].decimals) *
                  $store.tokens[invData.icons[0]].exchangeRate) /
                10 ** 6;
              const token2InXtz =
                ((tokenBAmount /
                  10 ** $store.tokens[invData.icons[1]].decimals) *
                  $store.tokens[invData.icons[1]].exchangeRate) /
                10 ** 6;
              const stakeInXtz = formatTokenAmount(token1InXtz + token2InXtz);
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz
              };
            } else if (invData.id === "PAUL-PAUL") {
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz: formatTokenAmount(
                  (+res.value.balance / 10 ** $store.tokens.PAUL.decimals) *
                    $store.tokens.PAUL.exchangeRate
                )
              };
            } else if (invData.id === "PAUL-XTZ" || invData.id === "MAG-XTZ") {
              const stakeInXtz = await calcTokenStakesFromQuipu({
                Tezos: $store.Tezos,
                id: invData.id,
                balance: invData.balance,
                paulToken: {
                  decimals: $store.tokens.PAUL.decimals,
                  exchangeRate: $store.tokens.PAUL.exchangeRate
                }
              });
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz
              };
            } else {
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz: null
              };
            }
          } else if (invData.platform === "wrap") {
            if (invData.id === "WRAP-STACKING") {
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz: formatTokenAmount(
                  (+res.value.balance / 10 ** $store.tokens.WRAP.decimals) *
                    $store.tokens.WRAP.exchangeRate
                )
              };
            } else if (invData.type === "staking") {
              const stakes = await calcTokenStakesInWrapFarms({
                invData,
                balance: res.value.balance,
                tokenExchangeRate:
                  $store.tokens[invData.rewardToken].exchangeRate,
                tokenDecimals: $store.tokens[invData.rewardToken].decimals,
                Tezos: $store.Tezos
              });
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz: stakes ? formatTokenAmount(stakes) : null
              };
            } else if (invData.type === "fee-farming") {
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz:
                  res.value.balance *
                  $store.tokens[invData.rewardToken].exchangeRate
              };
            } else {
              return {
                id: res.value.id,
                balance: res.value.balance,
                stakeInXtz: null
              };
            }
          } else {
            return {
              id: res.value.id,
              balance: res.value.balance,
              stakeInXtz: null
            };
          }
        })
    );
    investments = investmentsStakeInXtz
      .filter(val => val.status === "fulfilled")
      .map((val: PromiseFulfilledResult<any>) => val.value);
    loadingUserFarms = false;
  });
</script>

<style lang="scss">
  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    h3,
    h4 {
      text-align: center;

      .material-icons {
        vertical-align: middle;
      }
    }

    .title {
      position: relative;

      .share-link {
        position: absolute;
        top: 0px;
        right: 20px;
      }
    }

    .user-tokens-stats {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;

      & > div {
        width: 25%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 10px;
      }

      img {
        width: 25px;
        height: 25px;
        vertical-align: sub;
      }
    }

    .user-farms-stats {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;

      & > div {
        width: 25%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 10px;
      }

      img {
        width: 25px;
        height: 25px;
        vertical-align: sub;
      }
    }
  }
</style>

<section>
  {#if noUser}
    <h3>A user address is missing to display the profile.</h3>
  {:else}
    <div class="title">
      <h3>Profile for {username}</h3>
      {#if navigator.clipboard}
        <button
          class="share-link mini"
          on:click={async () => {
            shareLinkState = "clicked";
            await navigator.clipboard.writeText(
              `https://www.mytezosdefi.com/#/profile/${params.useraddress}`
            );
            setTimeout(() => (shareLinkState = "idle"), 2000);
          }}
        >
          {#if shareLinkState === "clicked"}
            Copied!
          {:else}
            Share link
          {/if}
        </button>
      {/if}
    </div>
  {/if}
  <h4>
    <span class="material-icons"> account_balance </span>
    XTZ balance
  </h4>
  {#if xtzBalance}
    <div style="text-align: center">{xtzBalance} ꜩ</div>
  {:else}
    <div style="text-align: center">Loading XTZ balance...</div>
  {/if}
  <h4>
    <span class="material-icons"> savings </span>
    Tokens balances
  </h4>
  <div class="user-tokens-stats">
    {#if loadingUserTokens}
      <div>Loading user's tokens...</div>
    {:else}
      {#each userTokens as token}
        <div>
          <div>
            <img src={`images/${token.id}.png`} alt="token-icon" />
            &nbsp; {token.id}
          </div>
          <div>{formatTokenAmount(token.balance, 3)} tokens</div>
          <div>
            {formatTokenAmount(
              token.balance * $store.tokens[token.id].exchangeRate,
              3
            )} ꜩ
          </div>
        </div>
      {:else}
        <div>No token found</div>
      {/each}
    {/if}
  </div>
  <h4>
    <span class="material-icons"> agriculture </span>
    Stakes in farms
  </h4>
  <div class="user-farms-stats">
    {#if loadingUserFarms}
      <div>Loading user's farms...</div>
    {:else}
      {#each investments as inv}
        <div>
          <div class="icon">
            {#each $store.investments[inv.id].icons as icon}
              <img src={`images/${icon}.png`} alt="token-icon" />
            {/each}
          </div>
          <div>{$store.investments[inv.id].alias}</div>
          {#if inv.stakeInXtz}
            <div>{inv.stakeInXtz} ꜩ</div>
          {:else}
            <div>N/A</div>
          {/if}
        </div>
      {:else}
        <div>No farm to show</div>
      {/each}
    {/if}
  </div>
</section>
