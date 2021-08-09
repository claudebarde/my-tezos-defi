<script lang="ts">
  import { afterUpdate } from "svelte";
  import moment from "moment";
  import store from "../../store";
  import type { AvailableToken, Operation } from "../../types";

  export let filterOps: {
      opType: "general" | "token" | "user";
      token?: AvailableToken | "XTZ";
    },
    lastOps: Operation[];

  let lastOpsFiltered = [];

  afterUpdate(() => {
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

  .container-last-operations {
    padding: 10px 0px;

    .row {
      display: grid;
      grid-template-columns: 10% 20% 25% 25% 20%;
      padding: 5px 10px;
      align-items: center;

      &.error {
        background-color: #f87171;
      }

      a {
        color: inherit;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      .icon {
        object {
          vertical-align: middle;
        }
        object,
        img {
          width: 25px;
          height: 25px;
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

<div class="container">
  <div class="title">
    {#if filterOps.opType === "user"}
      Your last operations
    {:else}
      Last operations on Tezos
    {/if}
  </div>
  <div class="container-last-operations">
    {#if $store.lastOperations.length > 0}
      <div class="row">
        <div />
        <div>Target</div>
        <div>Entrypoint</div>
        <div>Sender</div>
        <div>Value in tokens</div>
      </div>
    {/if}
    {#each lastOpsFiltered as op, index (op.entryId)}
      {#if index === 0 || op.level !== lastOpsFiltered[index - 1].level}
        <div class="row">
          <div style="grid-column:1 / span 4;margin:10px 0px;">
            Block level: {op.level}
            <span style="font-size:0.8rem">
              {#if index !== 0}
                ({moment(lastOpsFiltered[index - 1].timestamp).diff(
                  moment(op.timestamp),
                  "seconds"
                )} seconds block time)
              {:else}
                (Just now)
              {/if}
            </span>
          </div>
        </div>
      {/if}
      <div
        class="row"
        class:error={op.status === "failed" || op.status === "backtracked"}
      >
        <div class="icon" on:click={() => console.log(op.raw, op.tokenIds)}>
          <a
            href={`https://better-call.dev/mainnet/opg/${op.hash}/contents`}
            target="_blank"
            rel="noopener noreferrer nofollow"
          >
            {#each op.icons as icon}
              <object
                title="token-icon"
                data={`images/${icon}.png`}
                type="image/png"
              >
                <img src="images/user.png" alt="user" />
              </object>
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
          <span data-target={op.target.address}>{op.value}</span>
        </div>
      </div>
    {:else}
      <div>Waiting for new operations...</div>
    {/each}
  </div>
</div>
