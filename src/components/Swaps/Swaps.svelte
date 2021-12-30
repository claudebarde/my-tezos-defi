<script lang="ts">
  import TokenSelect from "./TokenSelect.svelte";
  import { formatTokenAmount } from "../../utils";
  import type { AvailableToken } from "../../types";

  let maxTokenLeft: number | null = null;
  let maxTokenRight: number | null = null;

  const selectToken = (arg: {
    token: AvailableToken | string;
    balance: number;
    tokenSide: "left" | "right";
  }) => {
    console.log(arg);
    const { token, balance, tokenSide } = arg;
    if (tokenSide === "left") {
      maxTokenLeft = formatTokenAmount(balance);
    } else {
      maxTokenRight = formatTokenAmount(balance);
    }
  };
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;
    position: relative;

    .swaps-inputs {
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;

      .swaps-inputs__input {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: lighten($container-bg-color, 60);
        padding: 10px 20px;
        margin: 10px;
        border-radius: 10px;
        gap: 40px;

        .swaps-inputs__input__text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;

          input {
            border: none;
            outline: none;
            font-size: 1rem;
            padding: 5px 10px;
            background-color: lighten($container-bg-color, 65);
            text-align: right;
          }

          .swaps-inputs__input__text__available-balance {
            font-size: 0.7rem;
            text-align: right;
            padding-top: 6px;
            cursor: pointer;
          }
        }
      }
    }
  }
</style>

<section>
  <div style="text-align:center;padding:10px">
    Under construction <span class="material-icons"> handyman </span>
  </div>
  <div class="swaps-inputs">
    <div class="swaps-inputs__input">
      <TokenSelect
        on:token-select={ev => selectToken({ ...ev.detail, tokenSide: "left" })}
      />
      <div class="swaps-inputs__input__text">
        <input type="text" />
        <span class="swaps-inputs__input__text__available-balance"
          >Max: {maxTokenLeft ?? "--"}</span
        >
      </div>
    </div>
    <span class="material-icons"> arrow_downward </span>
    <div class="swaps-inputs__input">
      <TokenSelect
        on:token-select={ev =>
          selectToken({ ...ev.detail, tokenSide: "right" })}
      />
      <div style="display:flex;flex-direction:column">
        <div class="swaps-inputs__input__text">
          <span>QuipuSwap</span>
          <input type="text" />
        </div>
        <br />
        <div class="swaps-inputs__input__text">
          <span>PlentySwap</span>
          <input type="text" />
          <span class="swaps-inputs__input__text__available-balance"
            >Max: {maxTokenRight ?? "--"}</span
          >
        </div>
      </div>
    </div>
  </div>
</section>
