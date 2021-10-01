<script lang="ts">
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { bounceOut } from "svelte/easing";
  import store from "../../store";
  import localStorageStore from "../../localStorage";

  let containerHeight = 0;

  onMount(() => {
    const container = document.getElementById("tokens-animation-container");
    if (container) {
      containerHeight = container.clientHeight;
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;
    position: relative;

    /*.available-tokens {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      justify-content: center;

      .available-token {
        border: solid 1px $bg-color;
        border-radius: 10px;
        padding: 10px;
        width: 250px;
        display: flex;
        justify-content: space-between;
        align-items: center;

        img {
          height: 2rem;
        }
      }
    }*/

    .hero {
      position: absolute;
      top: 20px;
      width: 100%;
      text-align: center;
    }

    .available-tokens {
      display: flex;
      justify-content: center;
      align-content: flex-start;
      flex-wrap: wrap-reverse;
      width: 100%;
      height: 100%;
      background-color: transparent;
      position: relative;

      img {
        height: 3rem;
        margin: 5px;
      }
    }
  }
</style>

<section>
  <!--<div class="available-tokens">
    {#each Object.entries($store.tokens).sort((a, b) => a[0]
        .toLowerCase()
        .localeCompare(b[0].toLowerCase())) as [tokenSymbol, tokenData]}
      <div class="available-token">
        <img src={`images/${tokenSymbol}.png`} alt={`${tokenSymbol}-logo`} />
        <span>{tokenSymbol}</span>
        <span style="font-size:0.9rem">
          ꜩ {+tokenData.exchangeRate.toFixed(3) / 1}
          <br />
          {#if $store.xtzData.exchangeRate}
            {(tokenData.exchangeRate * $store.xtzData.exchangeRate).toFixed(2)}
            {$localStorageStore.preferredFiat}
          {:else}
            ---
          {/if}
        </span>
      </div>
    {/each}
  </div>-->
  <div class="hero" in:fade={{ delay: 2000, duration: 3000 }}>
    <h1>Welcome to My Tezos Defi!</h1>
    <div>
      Track your tokens and investments across multiple platforms on the Tezos
      blockchain
    </div>
  </div>
  <div class="available-tokens" id="tokens-animation-container">
    {#if containerHeight > 0}
      {#each Object.keys($store.tokens) as token}
        <img
          src={`images/${token}.png`}
          alt={`${token}-logo`}
          in:fly={{
            delay: Math.random() * (2000 - 10) + 10,
            duration: 3000,
            x: 0,
            y: containerHeight * -1,
            easing: bounceOut
          }}
        />
      {/each}
    {/if}
  </div>
</section>
