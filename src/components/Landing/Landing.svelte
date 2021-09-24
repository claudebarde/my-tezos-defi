<script lang="ts">
  import store from "../../store";
  import localStorageStore from "../../localStorage";
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    .available-tokens {
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
    }
  }
</style>

<section>
  <div class="available-tokens">
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
  </div>
</section>
