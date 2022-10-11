<script lang="ts">
  import { onMount, beforeUpdate, afterUpdate } from "svelte";
  import { fly } from "svelte/transition";
  import { backInOut } from "svelte/easing";
  import pillStore, { PillTextType } from "./pillStore";
  import store from "../../store";
  import { formatTokenAmount } from "../../utils";

  let currentText = "";
  let currentTextType = undefined;
  let xtzPriceTrend: "up" | "down" | "same" | "none" = "none";
  let isAnimated = false;

  const animToLargeThenToNormal = () => {
    isAnimated = true;
    pillStore.switchShape("large");
    setTimeout(() => {
      isAnimated = false;
    }, 400);

    setTimeout(() => {
      isAnimated = true;
      pillStore.update({
        text: `1 XTZ = ${formatTokenAmount($store.xtzExchangeRate, 2)} ${
          $store.localStorage.getFavoriteFiat().code
        }`,
        type: PillTextType.XTZ_PRICE
      });
      pillStore.switchShape("normal");
      setTimeout(() => {
        isAnimated = false;
      }, 400);
    }, 3000);
  };

  beforeUpdate(() => {
    if (
      $pillStore.textType === PillTextType.TOKEN_PRICE &&
      (currentText !== $pillStore.text ||
        currentTextType !== $pillStore.textType)
    ) {
      // new token price info in pill
      animToLargeThenToNormal();
    }
  });

  afterUpdate(() => {
    if ($pillStore.textType === PillTextType.XTZ_PRICE) {
      const start = $store.xtzPriceHistoric[0].price;
      const end =
        $store.xtzPriceHistoric[$store.xtzPriceHistoric.length - 1].price;
      if (start > end) {
        xtzPriceTrend = "down";
      } else if (start < end) {
        xtzPriceTrend = "up";
      } else if (start === end) {
        xtzPriceTrend = "same";
      } else {
        xtzPriceTrend = "none";
      }
    }

    setTimeout(() => {
      currentText = $pillStore.text;
      currentTextType = $pillStore.textType;
    }, 100);
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .pill {
    position: absolute;
    bottom: 30px;
    left: 0;
    right: 0;
    margin: 0 auto;
    display: grid;
    align-items: center;
    background-color: $dark-cornflower-blue;
    color: white;
    font-size: 0.8rem;
    padding: 10px 30px;
    border-radius: 60px;
    text-align: center;
    box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
      rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
    line-height: 1;

    &.normal {
      width: 150px;
      height: 25px;
      grid-template-columns: 5% 90% 5%;

      &.animated {
        animation: retract 0.2s linear backwards;
      }
    }

    &.large {
      width: 300px;
      height: 30px;
      grid-template-columns: 10% 80% 10%;

      &.animated {
        animation: extend 0.2s linear backwards;
      }
    }

    @keyframes extend {
      0% {
        width: 150px;
        height: 25px;
      }
      100% {
        width: 300px;
        height: 30px;
      }
    }

    @keyframes retract {
      0% {
        width: 300px;
        height: 30px;
      }
      100% {
        width: 150px;
        height: 25px;
      }
    }
  }
</style>

{#if $pillStore.show && $store.isAppReady}
  <div
    class={`pill ${$pillStore.shape} ${isAnimated ? "animated" : ""}`}
    transition:fly={{ duration: 400, y: 100, easing: backInOut }}
  >
    <div class="pill__left">
      {#if $pillStore.textType === PillTextType.HARVEST_REWARDS}
        <span class="material-icons-outlined"> agriculture </span>
      {:else if $pillStore.textType === PillTextType.SUCCESS}
        <span class="material-icons-outlined" style="color:green">
          thumb_up
        </span>
      {:else if $pillStore.textType === PillTextType.ERROR}
        <span class="material-icons-outlined" style="color:red">
          thumb_down
        </span>
      {:else}
        &nbsp;
      {/if}
    </div>
    <div class="pill__middle">{currentText}</div>
    <div class="pill__right">
      {#if $pillStore.textType === PillTextType.XTZ_PRICE && xtzPriceTrend === "up"}
        <span class="material-icons-outlined" style="color:green">
          trending_up
        </span>
      {:else if $pillStore.textType === PillTextType.XTZ_PRICE && xtzPriceTrend === "down"}
        <span class="material-icons-outlined" style="color:red">
          trending_down
        </span>
      {:else if $pillStore.textType === PillTextType.XTZ_PRICE && xtzPriceTrend === "same"}
        <span class="material-icons-outlined"> trending_flat </span>
      {:else}
        &nbsp;
      {/if}
    </div>
  </div>
{/if}
