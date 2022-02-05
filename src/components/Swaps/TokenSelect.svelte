<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import store from "../../store";
  import { searchUserTokens } from "../../utils";
  import type { AvailableToken } from "../../types";

  export let tokensToIgnore: (AvailableToken | "XTZ")[];

  let active = false;
  let selectedToken: AvailableToken | string;
  const dispatch = createEventDispatcher();

  const triggerButton = () => {
    if (active === false) {
      // dropdown menu was hidden
      tokensToIgnore = [];
      selectedToken = "";
      setTimeout(() => {
        const input = document.getElementById("token-search-input");
        if (input) {
          input.focus();
        }
      }, 200);
    }
    active = !active;
    dispatch("click");
  };

  const selectToken = async (token: AvailableToken | string) => {
    active = false;
    selectedToken = token;
    if (token === "XTZ") {
      dispatch("token-select", {
        token,
        balance: $store.xtzData.balance / 10 ** 6
      });
    } else if (
      !$store.tokensBalances ||
      ($store.tokensBalances &&
        (!$store.tokensBalances.hasOwnProperty(token) ||
          !$store.tokensBalances[token]))
    ) {
      const balance = await searchUserTokens({
        Tezos: $store.Tezos,
        userAddress: $store.userAddress,
        tokens: [[token, $store.tokens[token]]]
      });
      dispatch("token-select", { token, balance: Object.values(balance)[0] });
    } else if ($store.tokensBalances && $store.tokensBalances[token]) {
      dispatch("token-select", {
        token,
        balance: $store.tokensBalances[token]
      });
    }
  };

  const selectTokensByName = (ev: KeyboardEvent) => {
    const ignoreTokens = () =>
      ["XTZ", ...Object.keys($store.tokens)]
        .sort((a, b) =>
          a.toLowerCase() > b.toLowerCase()
            ? 1
            : b.toLowerCase() > a.toLowerCase()
            ? -1
            : 0
        )
        .filter(tk => !tk.toLowerCase().includes(val));

    const val = ev.target.value.toLowerCase().trim();

    if (ev.key === "Enter") {
      const tokens = [
        "XTZ",
        ...Object.keys($store.tokens).sort((a, b) =>
          a.toLowerCase() > b.toLowerCase()
            ? 1
            : b.toLowerCase() > a.toLowerCase()
            ? -1
            : 0
        )
      ].filter(tk => !ignoreTokens().includes(tk));
      if (tokens.length > 0) {
        selectToken(tokens[0]);
      }
    } else if (val && val.length > 0) {
      const matchingTokens = ignoreTokens();
      tokensToIgnore = [...(matchingTokens as (AvailableToken | "XTZ")[])];
    } else {
      tokensToIgnore = [];
    }
  };

  /** Dispatch event on click outside of node */
  export function clickOutside(node) {
    const handleClick = event => {
      if (node && !node.contains(event.target) && !event.defaultPrevented) {
        node.dispatchEvent(new CustomEvent("click_outside", node));
      }
    };

    document.addEventListener("click", handleClick, true);

    return {
      destroy() {
        document.removeEventListener("click", handleClick, true);
      }
    };
  }
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
      background-color: lighten($container-bg-color, 60);
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

    .dropdown {
      $dropdown-height: 400px;

      position: absolute;
      top: 48px;
      left: 0px;
      max-height: $dropdown-height;
      width: calc(180px - 4px);
      background-color: lighten($container-bg-color, 60);
      border: solid 2px $container-bg-color;
      border-top: none;
      border-bottom-left-radius: 10px;
      border-bottom-right-radius: 10px;
      z-index: 999;
      overflow: hidden;

      .token-search-input {
        height: 40px;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;

        input {
          border: none;
          outline: none;
          font-size: 0.9rem;
          padding: 5px 10px;
          margin: 5px 10px;
          width: calc(100% - 40px);
          background-color: lighten($container-bg-color, 70);
          color: inherit;
        }
      }

      .tokens-list {
        max-height: calc(#{$dropdown-height} - 40px);
        overflow: auto;

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
  }
</style>

<div
  class="token-select-container"
  use:clickOutside
  on:click_outside={() => (active = false)}
>
  <button class="token-select" class:active on:focus={triggerButton}>
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
    <div class="dropdown">
      <div class="token-search-input">
        <input
          type="text"
          id="token-search-input"
          on:keyup={selectTokensByName}
        />
      </div>
      <div class="tokens-list">
        {#if !tokensToIgnore.includes("XTZ")}
          <div
            class="tokens-list-item"
            on:click={async () => await selectToken("XTZ")}
          >
            <img src="images/XTZ.png" alt="XTZ-icon" />
            XTZ
          </div>
        {/if}
        {#each Object.keys($store.tokens)
          .filter(token => !tokensToIgnore.includes(token))
          .sort( (a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : b.toLowerCase() > a.toLowerCase() ? -1 : 0) ) as token}
          <div
            class="tokens-list-item"
            on:click={async () => await selectToken(token)}
          >
            <img src={`images/${token}.png`} alt={`${token}-icon`} />
            {token}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
