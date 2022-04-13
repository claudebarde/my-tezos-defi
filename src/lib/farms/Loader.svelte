<script lang="ts">
  import type { IconSet } from "../../types";
  import { formatTokenAmount } from "../../utils";

  export let icons: IconSet, stake: number;
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .farm-loader {
    display: grid;
    grid-template-columns: 15% 25% 60%;
    align-items: center;
    border: 1px solid;
    border: none;
    padding: 30px 20px;
    margin: 20px 0px;
    background-color: $blizzard-blue;
    border-radius: $std-border-radius;
    text-align: center;
    animation-duration: 1s;
    animation-fill-mode: forwards;
    animation-iteration-count: infinite;
    animation-name: placeHolderShimmer;
    animation-timing-function: linear;
    background: linear-gradient(
      to right,
      $blizzard-blue 8%,
      $middle-blue 18%,
      $blizzard-blue 33%
    );

    .icons {
      margin: 0 auto;

      img {
        width: 48px;
        height: 48px;
        background-color: white;
        border-radius: 50%;
        transition: 0.3s;

        &:not(:first-child) {
          margin-left: -8px;
          border-radius: 50%;
        }
      }
    }

    div.bold {
      font-weight: bold;
    }
  }

  @keyframes placeHolderShimmer {
    0% {
      background-position: -468px 0;
    }
    100% {
      background-position: 468px 0;
    }
  }
</style>

<div class="farm-loader">
  <div class="icons">
    {#each icons as icon}
      <img src={`tokens/${icon}.png`} alt="farm-token-icon" />
    {/each}
  </div>
  <div>
    <div class="bold">
      {formatTokenAmount(stake)} LPT
    </div>
  </div>
  <div>Loading...</div>
</div>
