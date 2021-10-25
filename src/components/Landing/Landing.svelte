<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { bounceOut } from "svelte/easing";
  import store from "../../store";

  let containerHeight = 0;
  let wobbleInterval;

  onMount(() => {
    const container = document.getElementById("tokens-animation-container");
    if (container) {
      containerHeight = container.clientHeight;
    }

    // sets further animation after the tokens are set
    setTimeout(() => {
      wobbleInterval = setInterval(() => {
        // removes the currently assigned jello-horizontal class
        const els = document.getElementsByClassName("jello-horizontal");
        [...els].forEach(el => el.classList.remove("jello-horizontal"));
        // adds the jello-horizontal class to a new element
        const randomIndex = Math.floor(
          Math.random() * Object.keys($store.tokens).length
        );
        const token = document.getElementById(`token-landing-${randomIndex}`);
        token.classList.add("jello-horizontal");
      }, 1500);
    }, 6000);
  });

  onDestroy(() => {
    clearInterval(wobbleInterval);
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
  <div class="hero" in:fade={{ delay: 2000, duration: 3000 }}>
    <h1>Welcome to My Tezos Defi!</h1>
    <div>
      Track your tokens and investments across multiple DeFi platforms on the
      Tezos blockchain
    </div>
  </div>
  <div class="available-tokens" id="tokens-animation-container">
    {#if containerHeight > 0}
      {#each Object.keys($store.tokens) as token, index}
        <img
          class="token-landing"
          src={`images/${token}.png`}
          alt={`${token}-logo`}
          id={`token-landing-${index}`}
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
