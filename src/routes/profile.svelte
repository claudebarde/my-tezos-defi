<script lang="ts">
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";
  import store from "../store";
  import { shortenHash, tzktTokensFetch, formatTokenAmount } from "../utils";
  import ProfileHeader from "../lib/ProfileHeader.svelte";
  import {
    type TezosAccountAddress,
    AvailableToken,
    type TokenAmount,
    type UserToken
  } from "../types";

  export let param;

  let isConnectedUser = false;
  let profileAddress: TezosAccountAddress;
  let userTokens: Array<UserToken> = [];

  onMount(async () => {
    if (param) {
      profileAddress = param as TezosAccountAddress;

      if ($store.userAddress && param === $store.userAddress) {
        isConnectedUser = true;
      }

      // loads the user's details
      if (profileAddress === $store.userAddress) {
        userTokens = [
          ...$store.userTokens.sort(
            (a, b) =>
              b.balance / 10 ** $store.tokens[b.name].decimals -
              a.balance / 10 ** $store.tokens[a.name].decimals
          )
        ];
      } else {
        const tokens = await tzktTokensFetch(
          profileAddress,
          Object.values(AvailableToken)
        );
        if (tokens) {
          userTokens = [
            ...tokens.sort(
              (a, b) =>
                b.balance / 10 ** $store.tokens[b.name].decimals -
                a.balance / 10 ** $store.tokens[a.name].decimals
            )
          ];
        } else {
          userTokens = [];
        }
      }
    } else {
      push("/index");
    }
  });
</script>

<style lang="scss">
  .profile-tokens {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 30px;
    width: 100%;

    .profile-tokens__token {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;

      img {
        width: 42px;
        height: 42px;
      }
    }
  }
</style>

<div class="container">
  <h2>
    {isConnectedUser
      ? "My profile"
      : `Profile for ${shortenHash(profileAddress)}`}
  </h2>
  <ProfileHeader {profileAddress} />
  {#if userTokens.length > 0}
    <h3>Tokens</h3>
    <div class="profile-tokens">
      {#each userTokens as token}
        <div class="profile-tokens__token">
          <div>
            <img src={`/tokens/${token.name}.png`} alt="token-name" />
          </div>
          <div>{token.name}</div>
          <div>
            {formatTokenAmount(
              token.balance / 10 ** $store.tokens[token.name].decimals
            )} tokens
          </div>
          <div>
            {formatTokenAmount(
              $store.tokens[token.name].getExchangeRate() *
                (token.balance / 10 ** $store.tokens[token.name].decimals)
            )} tez
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {#if isConnectedUser}
    <!-- This is the profile of the connected user -->
  {:else}
    <!-- This is the profile of another user -->
  {/if}
</div>
