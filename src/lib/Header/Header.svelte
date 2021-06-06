<script lang="ts">
  import ConnectWallet from "./ConnectWallet.svelte";
</script>

<style lang="scss">
  header {
    height: 100px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 60%;
    margin: 0 auto;

    .left {
      font-size: 2rem;
      font-weight: bold;
    }

    .right {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>

<header>
  <div class="left">My Tezos DeFi</div>
  <div class="right">
    <ConnectWallet />
  </div>
</header>
