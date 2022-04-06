<script lang="ts">
  import store from "../store";
  import { sortTokensByBalance } from "../utils";
  import TokenBox from "$lib/TokenBox.svelte";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
</script>

<style lang="scss">
  .user-tokens {
    width: 80%;

    .user-tokens__grid {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
    }
  }
</style>

<svelte:head>
  <title>My Tezos Defi</title>
</svelte:head>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader />
    <div class="user-tokens">
      {#if $store.userAddress && $store.userTokens && $store.userTokens.some(tk => tk.exchangeRate && tk.exchangeRate > 0)}
        <div class="user-tokens__grid">
          {#each sortTokensByBalance($store.userTokens.map( tk => [tk.name, tk.balance / 10 ** $store.tokens[tk.name].decimals] )) as [token, _]}
            <TokenBox {token} />
          {/each}
        </div>
      {:else}
        Loading your tokens...
      {/if}
    </div>
  {:else}
    <div>No user connected</div>
  {/if}
</div>
