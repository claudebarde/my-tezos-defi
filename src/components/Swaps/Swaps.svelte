<script lang="ts">
  import store from "../../store";
  import TokenSelect from "./TokenSelect.svelte";
  import { formatTokenAmount, findTokenTotalSupply } from "../../utils";
  import type { AvailableToken } from "../../types";
  import { getRouteSwapData } from "../../tokenUtils/plentyUtils";

  let maxTokenLeft: number | null = null;
  let maxTokenRight: number | null = null;
  let tokenLeft: AvailableToken | string;
  let tokenRight: AvailableToken | string;
  let tokenLeftVal = "";
  let tokenRightQuipuVal = "";
  let tokenRightPlentyVal = "";
  let tokenRightPlentydetails: { minimumOut: number; fee: number };
  let loadingPlentyResults = false;

  const selectToken = async (arg: {
    token: AvailableToken | string;
    balance: number;
    tokenSide: "left" | "right";
  }) => {
    const { token, balance, tokenSide } = arg;
    if (tokenSide === "left") {
      maxTokenLeft = formatTokenAmount(balance);
      tokenLeft = token;
      await estimateSwap("left", null);
    } else {
      maxTokenRight = formatTokenAmount(balance);
      tokenRight = token;
      await estimateSwap("right", null);
    }
  };

  const estimateSwap = async (
    tokenSide: "left" | "right",
    value: null | string
  ) => {
    // if provided value is not a number
    if (isNaN(+value)) return;

    if (value && tokenSide === "left") {
      tokenLeftVal = value;
    }

    loadingPlentyResults = true;

    // TODO: handle cases with XTZ for PlentySwap
    if (tokenLeft && tokenRight && tokenLeftVal) {
      const exchangeFee = (+tokenLeftVal * 0.25) / 100;
      const tokenLeftContract = await $store.Tezos.wallet.at(
        $store.tokens[tokenLeft].address
      );
      const tokenLeftStorage: any = await tokenLeftContract.storage();
      const tokenLeftTotalSupply = await findTokenTotalSupply(
        tokenLeftStorage,
        $store.tokens[tokenLeft].type === "fa2"
          ? $store.tokens[tokenLeft].tokenId
          : undefined
      );

      const tokenRightContract = await $store.Tezos.wallet.at(
        $store.tokens[tokenRight].address
      );
      const tokenRightStorage: any = await tokenRightContract.storage();
      const tokenRightTotalSupply = await findTokenTotalSupply(
        tokenRightStorage,
        $store.tokens[tokenRight].type === "fa2"
          ? $store.tokens[tokenRight].tokenId
          : undefined
      );

      if (tokenLeftTotalSupply && tokenRightTotalSupply) {
        /*const plentyOutput = await computeTokenOutput(
          +tokenLeftVal,
          tokenLeftTotalSupply / 10 ** $store.tokens[tokenLeft].decimals,
          tokenRightTotalSupply / 10 ** $store.tokens[tokenRight].decimals,
          exchangeFee,
          0.5
        );
        if (plentyOutput && plentyOutput.tokenOut_amount > 0) {
          tokenRightPlentyVal = formatTokenAmount(
            plentyOutput.tokenOut_amount
          ).toString();
          tokenRightPlentydetails = {
            minimumOut: plentyOutput.minimum_Out,
            fee: plentyOutput.fees
          };
        } else {
          console.error("Unable to estimate token output");
        }*/
      } else {
        console.error(
          `Unable to find token supply: token left (${tokenLeftTotalSupply}) / token right (${tokenRightTotalSupply})`
        );
        return;
      }
    }
    loadingPlentyResults = false;
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
      align-items: stretch;
      width: 70%;
      margin: 0 auto;

      .swaps-inputs__input {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: lighten($container-bg-color, 60);
        padding: 20px;
        margin: 10px;
        border-radius: 10px;
        gap: 10px;

        input {
          border: none;
          outline: none;
          font-size: 1rem;
          padding: 5px 10px;
          background-color: lighten($container-bg-color, 65);
          text-align: right;
        }

        .swaps-inputs__input__text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;

          .swaps-inputs__input__text__available-balance {
            border: none;
            background-color: transparent;
            color: inherit;
            font-family: inherit;
            font-size: 0.7rem;
            text-align: right;
            padding-top: 6px;
            cursor: pointer;
          }
        }

        .swaps-inputs__input__result {
          display: grid;
          grid-template-columns: 25% 40% 35%;
          justify-items: center;
          width: 100%;

          .swaps-inputs__input__result__title {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: center;
            img {
              width: 40px;
              height: 40px;

              &.loading {
                -webkit-animation: heartbeat 1.5s ease-in-out infinite both;
                animation: heartbeat 1.5s ease-in-out infinite both;
              }
            }
          }

          .swaps-inputs__input__result__output {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: center;
          }

          .swaps-inputs__input__result__details {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: flex-start;
            font-size: 0.8rem;
          }

          .swaps-inputs__input__result__available-balance {
            border: none;
            background-color: transparent;
            color: inherit;
            font-family: inherit;
            font-size: 0.7rem;
            text-align: left;
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
        on:token-select={async ev =>
          await selectToken({ ...ev.detail, tokenSide: "left" })}
      />
      <div class="swaps-inputs__input__text">
        <input
          type="text"
          value={tokenLeftVal}
          on:change={async ev => await estimateSwap("left", ev.target.value)}
        />
        <button
          class="swaps-inputs__input__text__available-balance"
          on:click={() => {
            if (maxTokenLeft) tokenLeftVal = maxTokenLeft.toString();
          }}
        >
          Max: {maxTokenLeft ?? "--"}
        </button>
      </div>
      <div style="text-align:center">
        <span class="material-icons"> arrow_downward </span>
      </div>
      <TokenSelect
        on:token-select={async ev =>
          await selectToken({ ...ev.detail, tokenSide: "right" })}
      />
    </div>
    <div class="swaps-inputs__input">
      <div class="swaps-inputs__input__result">
        <div class="swaps-inputs__input__result__title">
          <div>QuipuSwap</div>
          <img src="images/QUIPUSWAP.png" alt="quipuswap" />
        </div>
        <div class="swaps-inputs__input__result__output">
          <input type="text" value={tokenRightQuipuVal} readonly />
          <button class="swaps-inputs__input__result__available-balance">
            Balance: {maxTokenRight ?? "--"}
          </button>
          <button class="primary">Swap</button>
        </div>
      </div>
    </div>
    <div class="swaps-inputs__input">
      <div class="swaps-inputs__input__result">
        <div class="swaps-inputs__input__result__title">
          <div>PlentySwap</div>
          <img
            src="images/PLENTY.png"
            alt="plentyswap"
            class:loading={loadingPlentyResults}
          />
        </div>
        <div class="swaps-inputs__input__result__output">
          <input type="text" value={tokenRightPlentyVal} readonly />
          <button class="swaps-inputs__input__result__available-balance">
            Balance: {maxTokenRight ?? "--"}
          </button>
          <button class="primary">Swap</button>
        </div>
        {#if tokenRightPlentydetails}
          <div class="swaps-inputs__input__result__details">
            <div>
              Minimum out: {formatTokenAmount(
                tokenRightPlentydetails.minimumOut
              )}
            </div>
            <div>
              Fee: {formatTokenAmount(tokenRightPlentydetails.fee)}
            </div>
            <div>
              MTD fee: {formatTokenAmount(
                (tokenRightPlentydetails.minimumOut *
                  $store.tokens[tokenLeft].exchangeRate *
                  0.3) /
                  100
              )} XTZ
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
