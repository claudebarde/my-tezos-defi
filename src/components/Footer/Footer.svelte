<script lang="ts">
  import config from "../../config";
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  footer {
    border-top: solid 2px $border-color;
    font-size: 0.7rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: white;
    position: relative;
    z-index: 99;

    a {
      color: #d97706;
      text-decoration: none;
    }
  }
</style>

<footer>
  <div />
  <div>
    Created with
    <a
      href="https://tezostaquito.io/"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      Taquito
    </a>,
    <a
      href="https://quipuswap.com/"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      QuipuSwap
    </a>,
    <a
      href="https://tzkt.io/"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      TzKT.io
    </a>,
    <a
      href="https://teztools.io/"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      TezTools
    </a>
    and
    <a
      href="https://www.coingecko.com/en/api"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      CoinGecko
    </a>
    -
    <a
      href="https://github.com/claudebarde/my-tezos-defi"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      Github
    </a>
    -
    <a
      href="https://twitter.com/MyTezosDefi"
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      Twitter
    </a>
  </div>
  <div>
    v{config.version}
  </div>
</footer>
