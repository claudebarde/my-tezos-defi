<script lang="ts">
  import store from "../../store";

  const shortenHash = (hash: string): string =>
    hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";
</script>

<style lang="scss">
  .container-last-operations {
    .row {
      display: grid;
      grid-template-columns: 10% 20% 25% 25% 20%;

      a {
        color: inherit;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      .icon {
        object,
        img {
          width: 25px;
          height: 25px;
        }
      }
    }
  }
</style>

<div class="container">
  <div class="title">Last operations on Tezos</div>
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
    {#each $store.lastOperations as op, index (op.entryId)}
      {#if index === 0 || op.level !== $store.lastOperations[index - 1].level}
        <div class="row">
          <div style="grid-column:1 / span 2;margin:10px 0px;">
            Block level: {op.level}
          </div>
        </div>
      {/if}
      <div class="row">
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
        <div>{op.value}</div>
      </div>
    {:else}
      <div>Waiting for new operations...</div>
    {/each}
  </div>
</div>
