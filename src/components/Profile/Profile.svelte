<script lang="ts">
  import { onMount } from "svelte";
  import {
    fetchTezosDomain,
    shortenHash,
    searchUserTokens,
    formatTokenAmount
  } from "../../utils";
  import store from "../../store";
  import type { AvailableToken } from "../../types";

  export let params;

  let noUser = false;
  let username = "";
  let xtzBalance: null | string = null;
  let loadingUserTokens = true;
  let userTokens: { id: AvailableToken; balance: number }[] = [];

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
      }
    }
  }
</style>

<section>
  {#if noUser}
    <h3>A user address is missing to display the profile.</h3>
  {:else}
    <h3>Profile for {username}</h3>
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
      <div>Loading user tokens...</div>
    {:else}
      {#each userTokens as token}
        <div>
          <div>
            <img src={`images/${token.id}.png`} alt="token-icon" />
            &nbsp; {token.id}
          </div>
          <div>{formatTokenAmount(token.balance, 3)} tokens</div>
        </div>
      {:else}
        <div>No token found</div>
      {/each}
    {/if}
  </div>
</section>
