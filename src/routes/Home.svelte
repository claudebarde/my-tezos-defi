<script lang="ts">
  import Layout from "./__layout.svelte";
  import store from "../store";
  import { sortTokensByBalance } from "../utils";
  import TokenBox from "../lib/TokenBox.svelte";
  import ProfileHeader from "../lib/ProfileHeader.svelte";
  import Bubbles from "../lib/Bubbles.svelte";
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

  .no-user-address {
    height: 100vh;
    width: calc(100% - 40px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 20px;
    position: relative;

    p {
      padding: 10px;
    }
  }
</style>

<svelte:head>
  <title>My Tezos Defi</title>
</svelte:head>

<Layout>
  <div class="container">
    {#if $store.userAddress}
      <ProfileHeader profileAddress={$store.userAddress} />
      <div class="user-tokens">
        {#if $store.userAddress && $store.userTokens && $store.tokens}
          <div class="user-tokens__grid">
            {#each sortTokensByBalance($store.userTokens.map( tk => [tk.name, tk.balance / 10 ** $store.tokens[tk.name].decimals] )) as [token, _] (token)}
              <TokenBox {token} />
            {/each}
          </div>
        {:else}
          Loading your tokens...
        {/if}
      </div>
    {:else}
      <div class="no-user-address">
        <h3>Welcome to MyTezosDefi</h3>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
        <p>To start, please connect your wallet from the menu</p>
        <Bubbles />
      </div>
    {/if}
  </div>
</Layout>
