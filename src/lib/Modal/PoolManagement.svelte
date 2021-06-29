<script lang="ts">
  export let manageModalInput;
</script>

<style lang="scss">
  .pool-details {
    width: 70%;
    display: flex;
    justify-content: space-around;

    div {
      margin: 4px;
    }
  }

  .stake-row {
    display: grid;
    grid-template-columns: 15% 20% 45% 20%;
    align-items: center;
    width: 100%;
    padding: 5px;

    .unstake-box {
      .material-icons {
        vertical-align: bottom;
        cursor: pointer;
      }
    }
  }
</style>

{#if manageModalInput.loading}
  <div>Loading...</div>
{:else}
  {#if manageModalInput.balance && manageModalInput.token}
    <div>Your balance: {manageModalInput.balance} {manageModalInput.token}</div>
    <br />
  {/if}
  <div class="pool-details">
    {#if manageModalInput.body && manageModalInput.body.length > 1}
      <div>
        {#each manageModalInput.body as item}
          <div>{item}</div>
        {/each}
      </div>
      <div>
        <div>Current rewards:</div>
        <div>
          <button class="button default">Stake</button>
        </div>
      </div>
    {/if}
  </div>
  <br />
  {#if Array.isArray(manageModalInput.stakes)}
    {#each manageModalInput.stakes as stake, index}
      <div class="stake-row">
        <div>Stake {index + 1}</div>
        <div>{stake.amount} {manageModalInput.token || "--"}</div>
        <div>
          Withdrawal fee: {stake.withdrawalFee}
          {manageModalInput.token || "--"}
        </div>
        <div class="unstake-box">
          Unstake
          {#if manageModalInput.unstake.includes(stake.id)}
            <span
              class="material-icons"
              on:click={() => {
                manageModalInput.unstake = [
                  ...manageModalInput.unstake.filter(id => id !== stake.id)
                ];
              }}
            >
              check_box
            </span>
          {:else}
            <span
              class="material-icons"
              on:click={() => {
                manageModalInput.unstake = [
                  stake.id,
                  ...manageModalInput.unstake
                ];
              }}
            >
              check_box_outline_blank
            </span>
          {/if}
        </div>
      </div>
    {:else}
      <div>No stake in this contract</div>
    {/each}
  {/if}
{/if}
