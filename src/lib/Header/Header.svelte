<script lang="ts">
  import ConnectWallet from "./ConnectWallet.svelte";
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

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

  @media only screen and (max-width: $mobile-break-point) {
    header {
      flex-direction: column;
      margin-bottom: 20px;
    }
  }
</style>

<header>
  <div class="left">My Tezos DeFi</div>
  <div class="right">
    <ConnectWallet />
  </div>
</header>
