<script lang="ts">
  import { withSlippage, estimateSwap } from "@quipuswap/sdk";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import TokenSelect from "./TokenSelect.svelte";
  import { formatTokenAmount, findTokenTotalSupply } from "../../utils";
  import type { AvailableToken } from "../../types";
  import { computeTokenOutput } from "../../tokenUtils/plentyUtils";
  import config from "../../config";

  let maxTokenLeft: number | null = null;
  let maxTokenRight: number | null = null;
  let tokenLeft: AvailableToken | string;
  let tokenRight: AvailableToken | string;
  let tokenLeftVal = "";
  let tokenRightQuipuVal = "";
  let tokenRightPlentyVal = "";
  let tokenRightPlentyDetails: { minimumOut: number; fee: number };
  let tokenRightQuipuDetails: { minimumOut: number; fee: number };
  let loadingPlentyResults = false;
  let loadingQuipuResults = false;
  let tokensToIgnore = { left: [], right: [] };
  let mtdFee: null | number = null;

  const selectToken = async (arg: {
    token: AvailableToken | string;
    balance: number;
    tokenSide: "left" | "right";
  }) => {
    const { token, balance, tokenSide } = arg;
    if (tokenSide === "left") {
      maxTokenLeft = formatTokenAmount(balance);
      tokenLeft = token;
      tokensToIgnore.right = [token];
      await Promise.allSettled([
        estimatePlentySwap("left", null),
        estimateQuipuSwap("left", null)
      ]);
    } else {
      maxTokenRight = formatTokenAmount(balance);
      tokenRight = token;
      tokensToIgnore.left = [token];
      await Promise.allSettled([
        estimatePlentySwap("right", null),
        estimateQuipuSwap("right", null)
      ]);
    }
  };

  const estimatePlentySwap = async (
    tokenSide: "left" | "right",
    value: null | string
  ) => {
    // if provided value is not a number
    if (isNaN(+value)) return;

    if (value && tokenSide === "left") {
      tokenLeftVal = value;
    }

    loadingPlentyResults = true;

    if (tokenLeft && tokenRight && tokenLeftVal) {
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
      // loads DEX data
      const dexAddressVal = Object.entries(config.plentyDexAddresses).find(
        val => val[0].includes(tokenLeft) && val[0].includes(tokenRight)
      );

      if (tokenLeftTotalSupply && tokenRightTotalSupply && dexAddressVal) {
        const [_, dexAddress] = dexAddressVal;
        const dexContract = await $store.Tezos.wallet.at(dexAddress);
        const dexStorage: any = await dexContract.storage();
        const { lpFee, systemFee } = dexStorage;
        const exchangeFee = 1 / lpFee.toNumber() + 1 / systemFee.toNumber();
        const plentyOutput = await computeTokenOutput(
          +tokenLeftVal,
          tokenLeftTotalSupply / 10 ** $store.tokens[tokenLeft].decimals,
          tokenRightTotalSupply / 10 ** $store.tokens[tokenRight].decimals,
          exchangeFee,
          0.005
        );
        if (plentyOutput && plentyOutput.tokenOut_amount > 0) {
          tokenRightPlentyVal = plentyOutput.tokenOut_amount.toString();
          tokenRightPlentyDetails = {
            minimumOut: plentyOutput.minimum_Out,
            fee: plentyOutput.fees
          };
          mtdFee =
            +tokenLeftVal *
            $store.tokens[tokenLeft].exchangeRate *
            config.mtdFee;
        } else {
          console.error("Unable to estimate token output");
        }
      } else {
        console.error(
          `Unable to find token supply: token left (${tokenLeftTotalSupply}) / token right (${tokenRightTotalSupply})`
        );
        return;
      }
    }
    loadingPlentyResults = false;
  };

  const estimateQuipuSwap = async (
    tokenSide: "left" | "right",
    value: null | string
  ) => {
    // if provided value is not a number
    if (isNaN(+value)) return;

    if (value && tokenSide === "left") {
      tokenLeftVal = value;
    }

    if (tokenLeft && tokenRight && tokenLeftVal) {
      loadingQuipuResults = true;

      try {
        let fromAsset;
        if (tokenLeft === "XTZ") {
          fromAsset = "tez";
        } else {
          const { type, address, tokenId } = $store.tokens[tokenLeft];
          if (type === "fa1.2") {
            fromAsset = { contract: address };
          } else {
            fromAsset = { contract: address, id: tokenId };
          }
        }

        let toAsset;
        if (tokenRight === "XTZ") {
          toAsset = "tez";
        } else {
          const { type, address, tokenId } = $store.tokens[tokenRight];
          if (type === "fa1.2") {
            toAsset = { contract: address };
          } else {
            toAsset = { contract: address, id: tokenId };
          }
        }

        const estimatedOutputValue = await estimateSwap(
          $store.Tezos,
          config.quipuswapFactories,
          fromAsset,
          toAsset,
          {
            inputValue: +tokenLeftVal * 10 ** $store.tokens[tokenLeft].decimals
          }
        );
        if (estimatedOutputValue) {
          tokenRightQuipuVal = (
            estimatedOutputValue.toNumber() /
            10 ** $store.tokens[tokenRight].decimals
          ).toString();
          const minimumOut = withSlippage(
            estimatedOutputValue.toNumber(),
            0.005
          );
          tokenRightQuipuDetails = {
            minimumOut:
              minimumOut.toNumber() / 10 ** $store.tokens[tokenRight].decimals,
            fee: 0
          };
          mtdFee =
            +tokenLeftVal *
            $store.tokens[tokenLeft].exchangeRate *
            config.mtdFee;
        }
      } catch (err) {
        console.error(err);
      } finally {
        loadingQuipuResults = false;
      }
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
      align-items: stretch;
      width: 80%;
      margin: 0 auto;

      .swaps-inputs__input {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: lighten($container-bg-color, 65);
        padding: 20px;
        margin: 10px;
        border-radius: 10px;
        gap: 10px;

        input {
          border: none;
          outline: none;
          font-size: 1rem;
          padding: 5px 10px;
          background-color: lighten($container-bg-color, 70);
          text-align: right;
        }

        .swaps-inputs__input__text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;

          .swaps-inputs__input__text__details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            width: 100%;
            padding-top: 6px;

            button {
              border: none;
              background-color: transparent;
              color: inherit;
              font-family: inherit;
              font-size: inherit;
              text-align: right;
              cursor: pointer;
            }
          }
        }

        .swaps-inputs__input__result {
          display: grid;
          grid-template-columns: 20% 40% 40%;
          gap: 20px;
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
            width: 100%;

            input {
              width: 90%;
            }
          }

          .swaps-inputs__input__result__info {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: flex-start;
            font-size: 0.8rem;
          }

          .swaps-inputs__input__result__details {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.7rem;
            width: 100%;
            padding-top: 6px;

            button {
              border: none;
              background-color: transparent;
              color: inherit;
              font-family: inherit;
              font-size: inherit;
              text-align: right;
              cursor: pointer;
            }
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
        tokensToIgnore={tokensToIgnore.left}
        on:token-select={async ev =>
          await selectToken({ ...ev.detail, tokenSide: "left" })}
      />
      <div class="swaps-inputs__input__text">
        <input
          type="text"
          value={tokenLeftVal}
          on:input={async ev => {
            await Promise.allSettled([
              estimatePlentySwap("left", ev.target.value),
              estimateQuipuSwap("left", ev.target.value)
            ]);
          }}
        />
        <div class="swaps-inputs__input__text__details">
          <button
            on:click={async () => {
              if (maxTokenLeft) {
                tokenLeftVal = maxTokenLeft.toString();
                await Promise.allSettled([
                  estimatePlentySwap("left", tokenLeftVal),
                  estimateQuipuSwap("left", tokenLeftVal)
                ]);
              }
            }}
          >
            Max: {maxTokenLeft ?? "--"}
          </button>
          {#if tokenLeftVal}
            <div>
              ~{formatTokenAmount(
                +tokenLeftVal *
                  $store.tokens[tokenLeft].exchangeRate *
                  $store.xtzData.exchangeRate,
                2
              )}
              {$localStorageStore.preferredFiat}
            </div>
          {/if}
        </div>
      </div>
      <div style="text-align:center">
        <span class="material-icons"> arrow_downward </span>
      </div>
      <TokenSelect
        tokensToIgnore={tokensToIgnore.right}
        on:token-select={async ev =>
          await selectToken({ ...ev.detail, tokenSide: "right" })}
      />
    </div>
    <div class="swaps-inputs__input">
      <div class="swaps-inputs__input__result">
        <div class="swaps-inputs__input__result__title">
          <div>QuipuSwap</div>
          <img
            src="images/QUIPUSWAP.png"
            alt="quipuswap"
            class:loading={loadingQuipuResults}
          />
        </div>
        <div class="swaps-inputs__input__result__output">
          <input type="text" value={tokenRightQuipuVal} readonly />
          <div class="swaps-inputs__input__result__details">
            <button>
              Balance: {maxTokenRight ?? "--"}
            </button>
            {#if tokenRightQuipuVal}
              <div>
                ~{formatTokenAmount(
                  +tokenRightQuipuVal *
                    $store.tokens[tokenRight].exchangeRate *
                    $store.xtzData.exchangeRate,
                  2
                )}
                {$localStorageStore.preferredFiat}
              </div>
            {/if}
          </div>
          <br />
          <button class="primary" disabled={!tokenRightQuipuVal}>Swap</button>
        </div>
        {#if tokenRightQuipuDetails}
          <div class="swaps-inputs__input__result__info">
            <div>
              Minimum out: {formatTokenAmount(
                tokenRightQuipuDetails.minimumOut
              )}
            </div>
            <div>
              Difference: {formatTokenAmount(
                Math.abs(
                  +tokenLeftVal *
                    $store.tokens[tokenLeft].exchangeRate *
                    $store.xtzData.exchangeRate -
                    +tokenRightQuipuVal *
                      $store.tokens[tokenRight].exchangeRate *
                      $store.xtzData.exchangeRate
                )
              )}
              {$localStorageStore.preferredFiat}
            </div>
            <div>
              Fee: {formatTokenAmount(tokenRightQuipuDetails.fee)}
            </div>
            <div>
              MTD fee: {formatTokenAmount(mtdFee)} XTZ
            </div>
          </div>
        {/if}
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
          <div class="swaps-inputs__input__result__details">
            <button>
              Balance: {maxTokenRight ?? "--"}
            </button>
            {#if tokenRightPlentyVal}
              <div>
                ~{formatTokenAmount(
                  +tokenRightPlentyVal *
                    $store.tokens[tokenRight].exchangeRate *
                    $store.xtzData.exchangeRate,
                  2
                )}
                {$localStorageStore.preferredFiat}
              </div>
            {/if}
          </div>
          <br />
          <button class="primary" disabled={!tokenRightPlentyVal}>Swap</button>
        </div>
        {#if tokenRightPlentyDetails}
          <div class="swaps-inputs__input__result__info">
            <div>
              Minimum out: {formatTokenAmount(
                tokenRightPlentyDetails.minimumOut
              )}
            </div>
            <div>
              Difference: {formatTokenAmount(
                Math.abs(
                  +tokenLeftVal *
                    $store.tokens[tokenLeft].exchangeRate *
                    $store.xtzData.exchangeRate -
                    +tokenRightPlentyVal *
                      $store.tokens[tokenRight].exchangeRate *
                      $store.xtzData.exchangeRate
                )
              )}
              {$localStorageStore.preferredFiat}
            </div>
            <div>
              Fee: {formatTokenAmount(tokenRightPlentyDetails.fee)}
            </div>
            <div>
              MTD fee: {formatTokenAmount(mtdFee)} XTZ
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>
