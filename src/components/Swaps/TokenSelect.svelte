<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import store from "../../store";
  import { searchUserTokens } from "../../utils";
  import type { AvailableToken } from "../../types";

  let active = false;
  let selectedToken: AvailableToken | string;
  const dispatch = createEventDispatcher();

  const selectToken = async (token: AvailableToken | string) => {
    active = false;
    selectedToken = token;
    if (
      $store.tokensBalances &&
      (!$store.tokensBalances.hasOwnProperty(token) ||
        !$store.tokensBalances[token])
    ) {
      const balance = await searchUserTokens({
        Tezos: $store.Tezos,
        userAddress: $store.userAddress,
        tokens: [token, $store.tokens[token]]
      });
      console.log(balance);
      dispatch("token-select", { token, balance });
    } else {
      dispatch("token-select", {
        token,
        balance: $store.tokensBalances[token]
      });
    }
  };
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .token-select-container {
    position: relative;
    padding: 0px;

    .token-select {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 0.9rem;
      border: solid 2px $container-bg-color;
      background-color: transparent;
      color: inherit;
      padding: 5px 10px;
      margin: 0px;
      border-radius: 10px;
      outline: none;
      height: 48px;
      width: 180px;

      &.active {
        border-bottom-left-radius: 0px;
        border-bottom-right-radius: 0px;
      }

      .selected-token {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        padding: 10px;
        cursor: pointer;

        img {
          width: 32px;
          height: 32px;
        }
      }
    }

    .tokens-list {
      position: absolute;
      top: 48px;
      left: 0px;
      height: 400px;
      width: calc(180px - 4px);
      overflow: auto;
      background-color: lighten($container-bg-color, 60);
      border: solid 2px $container-bg-color;
      border-top: none;
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
      z-index: 999;

      .tokens-list-item {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 10px;
        font-size: 0.9rem;
        padding: 10px;
        cursor: pointer;

        img {
          width: 32px;
          height: 32px;
        }
      }
    }
  }
</style>

<div class="token-select-container">
  <button class="token-select" class:active on:click={() => (active = !active)}>
    {#if selectedToken}
      <div class="selected-token">
        <img
          src={`images/${selectedToken}.png`}
          alt={`${selectedToken}-icon`}
        />
        {selectedToken}
        <span class="material-icons"> expand_more </span>
      </div>
    {:else}
      Select a token <span class="material-icons"> expand_more </span>
    {/if}
  </button>
  {#if active}
    <div class="tokens-list">
      <div
        class="tokens-list-item"
        on:click={async () => await selectToken("XTZ")}
      >
        <img src="images/XTZ.png" alt="XTZ-icon" />
        XTZ
      </div>
      {#each Object.keys($store.tokens).sort( (a, b) => (a > b ? 1 : b > a ? -1 : 0) ) as token}
        <div
          class="tokens-list-item"
          on:click={async () => await selectToken(token)}
        >
          <img src={`images/${token}.png`} alt={`${token}-icon`} />
          {token}
        </div>
      {/each}
    </div>
  {/if}
</div>
