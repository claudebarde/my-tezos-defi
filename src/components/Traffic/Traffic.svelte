<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import type { AvailableToken } from "../../types";

  export let filterOps: {
    opType: "general" | "token" | "user";
    token?: AvailableToken | "XTZ";
  };

  let lastOpsFiltered = [];

  afterUpdate(() => {
    const lastOps = $store.lastOperations;

    if (
      lastOps.length > 0 &&
      JSON.stringify(lastOps) !== JSON.stringify(lastOpsFiltered)
    ) {
      const currentLevel = lastOps[0].level;
      lastOpsFiltered = lastOps
        .filter(op => {
          // selects a certain number of transactions to display
          if (filterOps.opType === "user") {
            return true;
          } else if (
            filterOps.opType === "general" ||
            filterOps.opType === "token"
          ) {
            return op.level > currentLevel - 5;
          }
        })
        .filter(op => {
          if (filterOps.opType === "general" || filterOps.opType === "user") {
            return true;
          } else if (filterOps.opType === "token") {
            return op.target.address === $store.tokens[filterOps.token].address;
          }
        });
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 0px 10px 20px 10px;
    height: 80vh;
    overflow: auto;
    position: relative;

    .container-last-operations {
      padding: 0px;

      .row {
        display: grid;
        grid-template-columns: 10% 20% 25% 25% 20%;
        padding: 10px;
        align-items: center;

        &.header {
          position: fixed;
          width: 70%;
          background-color: white;
        }
        &.error {
          background-color: #f87171;
        }
        &.second {
          background-color: lighten($container-bg-color, 65);
        }

        a {
          color: inherit;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }

        .icon {
          img {
            vertical-align: middle;
            width: 25px;
            height: 25px;
          }
        }
      }
    }
  }

  @media only screen and (max-width: $mobile-break-point) {
    .container-last-operations {
      .row {
        grid-template-columns: 20% 40% 40%;

        & > div:nth-child(2) {
          text-align: center;
        }
        & > div:nth-child(3) {
          display: none;
        }
        & > div:nth-child(4) {
          display: none;
        }
        & > div:nth-child(5) {
          text-align: center;
        }
      }
    }
  }
</style>

<section>
  <div class="container-last-operations">
    {#if $store.lastOperations.length > 0}
      <div class="row header">
        <div />
        <div>Target</div>
        <div>Entrypoint</div>
        <div>Sender</div>
        <div>Value in tokens</div>
      </div>
    {/if}
    <br /><br />
    {#each lastOpsFiltered as op, index (op.entryId)}
      {#if index === 0 || op.level !== lastOpsFiltered[index - 1].level}
        <div class="row">
          <div style="grid-column:1 / span 4;margin:10px 0px;">
            Block level: {op.level}
            <span style="font-size:0.8rem">
              ({Math.floor((Date.now() - Date.parse(op.timestamp)) / 1000)} seconds
              ago)
            </span>
          </div>
        </div>
      {/if}
      <div
        class="row"
        class:error={op.status === "failed" || op.status === "backtracked"}
        class:second={op.status !== "failed" &&
          op.status !== "backtracked" &&
          index % 2 === 0}
      >
        <div class="icon" on:click={() => console.log(op.raw, op.tokenIds)}>
          <a
            href={`https://better-call.dev/mainnet/opg/${op.hash}/contents`}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {#each op.icons as icon}
              <img src={`images/${icon}.png`} alt={icon} />
            {/each}
          </a>
        </div>
        <div>
          <a
            href={`https://better-call.dev/mainnet/${op.target.address}/operations`}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {op.target.alias}
          </a>
        </div>
        <div>{op.entrypoint}</div>
        <div>
          <a
            href={`https://better-call.dev/mainnet/${op.sender.address}/operations`}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {op.sender.alias}
          </a>
        </div>
        <div>
          <span data-target={op.target.address}>
            {op.value ? op.value : ""}
          </span>
        </div>
      </div>
    {:else}
      <div>Waiting for new operations...</div>
    {/each}
  </div>
</section>
