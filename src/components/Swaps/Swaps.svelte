<script lang="ts">
  import { withSlippage, estimateSwap } from "@quipuswap/sdk";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import TokenSelect from "./TokenSelect.svelte";
  import { formatTokenAmount, findTokenTotalSupply } from "../../utils";
  import { AvailableToken } from "../../types";
  import { computeTokenOutput } from "../../tokenUtils/plentyUtils";
  import config from "../../config";
  import DexResults from "./DexResults.svelte";

  let maxTokenLeft: number | null = null;
  let maxTokenRight: number | null = null;
  let tokenLeft: AvailableToken | string;
  let tokenRight: AvailableToken | string;
  let tokenLeftVal = "";
  let tokenRightQuipuVal = "";
  let tokenRightPlentyVal = "";
  let tokenRightVortexVal = "";
  let tokenRightPlentyDetails: { minimumOut: number; fee: number };
  let tokenRightQuipuDetails: { minimumOut: number; fee: number };
  let tokenRightVortexDetails: { minimumOut: number; fee: number };
  let loadingPlentyResults = false;
  let loadingQuipuResults = false;
  let loadingVortexResults = false;
  let tokensToIgnore = { left: [], right: [] };
  let mtdFee: null | number = null;
  let slippage = 0.005;

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
        estimateQuipuSwap("left", null),
        estimateVortexSwap("left", null)
      ]);
    } else {
      maxTokenRight = formatTokenAmount(balance);
      tokenRight = token;
      tokensToIgnore.left = [token];
      await Promise.allSettled([
        estimatePlentySwap("right", null),
        estimateQuipuSwap("right", null),
        estimateVortexSwap("left", null)
      ]);
    }
  };

  const estimatePlentySwap = async (
    tokenSide: "left" | "right",
    value: null | string
  ) => {
    // if provided value is not a number
    if (isNaN(+value)) return;

    loadingPlentyResults = true;

    if (tokenLeft && tokenRight && tokenLeftVal) {
      try {
        const tokenLeftAmount =
          +tokenLeftVal * 10 ** $store.tokens[tokenLeft].decimals;
        const swapOutput = await computeTokenOutput(
          tokenLeftAmount,
          {
            name: tokenLeft as AvailableToken,
            decimals:
              tokenLeft === "XTZ" ? 6 : $store.tokens[tokenLeft].decimals
          },
          {
            name: tokenRight as AvailableToken,
            decimals:
              tokenRight === "XTZ" ? 6 : $store.tokens[tokenRight].decimals
          },
          slippage
        );
        const token1ToCtezRouting = await computeTokenOutput(
          tokenLeftAmount,
          {
            name: tokenLeft as AvailableToken,
            decimals:
              tokenLeft === "XTZ" ? 6 : $store.tokens[tokenLeft].decimals
          },
          { name: AvailableToken.Ctez, decimals: $store.tokens.Ctez.decimals },
          slippage
        );
        const ctezToToken2Routing = await computeTokenOutput(
          token1ToCtezRouting.token2Amount * 10 ** $store.tokens.Ctez.decimals,
          { name: AvailableToken.Ctez, decimals: $store.tokens.Ctez.decimals },
          {
            name: tokenRight as AvailableToken,
            decimals:
              tokenRight === "XTZ" ? 6 : $store.tokens[tokenRight].decimals
          },
          slippage
        );
        console.log(swapOutput);
        console.log(ctezToToken2Routing);

        if (swapOutput && swapOutput.token2Amount > 0) {
          tokenRightPlentyVal = formatTokenAmount(
            swapOutput.token2Amount,
            8
          ).toString();
          tokenRightPlentyDetails = {
            minimumOut: swapOutput.minimumOut,
            fee: swapOutput.fees / 10 ** $store.tokens.PLENTY.decimals
          };
          mtdFee =
            +tokenLeftVal *
            $store.tokens[tokenLeft].exchangeRate *
            $store.serviceFee;
        } else {
          console.error("Unable to estimate token output");
        }
      } catch (error) {
        console.error(error);
      }
      /*const tokenLeftContract = await $store.Tezos.wallet.at(
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
            $store.serviceFee;
        } else {
          console.error("Unable to estimate token output");
        }
      } else {
        console.error(
          `Unable to find token supply: token left (${tokenLeftTotalSupply}) / token right (${tokenRightTotalSupply})`
        );
      }*/
    }
    loadingPlentyResults = false;
  };

  const estimateQuipuSwap = async (
    tokenSide: "left" | "right",
    value: null | string
  ) => {
    // if provided value is not a number
    if (isNaN(+value)) return;

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
          tokenRightQuipuVal = formatTokenAmount(
            estimatedOutputValue.toNumber() /
              10 ** $store.tokens[tokenRight].decimals,
            8
          ).toString();
          const minimumOut = withSlippage(
            estimatedOutputValue.toNumber(),
            slippage
          );
          tokenRightQuipuDetails = {
            minimumOut:
              minimumOut.toNumber() / 10 ** $store.tokens[tokenRight].decimals,
            fee: 0
          };
          mtdFee =
            +tokenLeftVal *
            $store.tokens[tokenLeft].exchangeRate *
            $store.serviceFee;
        }
      } catch (err) {
        console.error(err);
      } finally {
        loadingQuipuResults = false;
      }
    }
  };

  const estimateVortexSwap = async (
    tokenSide: "left" | "right",
    value: null | string
  ) => {
    const exchangeTokenToXtz = (
      tokenLeft_pool: number,
      tokenRight_pool: number,
      tokenLeftAmount: number
    ) => {
      return (
        (9972 * tokenRight_pool * tokenLeftAmount) /
        (10_000 * (tokenLeft_pool + tokenLeftAmount))
      );
    };
    const exchangeXtzToToken = (p: {
      xtzPool: number;
      tokenPool: number;
      xtzAmount: number;
    }) => {
      const { xtzPool, tokenPool, xtzAmount } = p;
      return (0.9972 * xtzAmount * tokenPool) / (xtzPool + 0.9972 * xtzAmount);
    };
    // if provided value is not a number
    if (isNaN(+value)) return;

    if (tokenLeft && tokenRight && tokenLeftVal) {
      loadingVortexResults = true;

      // finds dexes
      if (tokenLeft === "XTZ" || tokenRight === "XTZ") {
        // simple case scenario
      } else {
        // this requires 2 DEX address
        const dexTokenLeft = Object.entries(config.vortexDexAddresses).find(
          val => val[0] === `${tokenLeft}-XTZ`
        );
        const dexTokenRight = Object.entries(config.vortexDexAddresses).find(
          val => val[0] === `${tokenRight}-XTZ`
        );
        if (dexTokenLeft && dexTokenRight) {
          const dexTokenLeftAddress = dexTokenLeft[1];
          const dexTokenRightAddress = dexTokenRight[1];
          // fetches contract storages
          const tokenLeftContract = await $store.Tezos.wallet.at(
            dexTokenLeftAddress
          );
          const tokenLeftStorage: any = await tokenLeftContract.storage();
          const tokenRightContract = await $store.Tezos.wallet.at(
            dexTokenRightAddress
          );
          const tokenRightStorage: any = await tokenRightContract.storage();
          // calculates exchange rates
          const tokenLeftToXtz = exchangeTokenToXtz(
            tokenLeftStorage.tokenPool.toNumber(),
            tokenLeftStorage.xtzPool.toNumber(),
            +tokenLeftVal * 10 ** $store.tokens[tokenLeft].decimals
          );
          const xtzToTokenRight = exchangeXtzToToken({
            xtzPool: tokenRightStorage.xtzPool.toNumber(),
            tokenPool: tokenRightStorage.tokenPool.toNumber(),
            xtzAmount: tokenLeftToXtz
          });
          /*console.log("Vortex exchange rate:");
          console.log(
            tokenLeftToXtz,
            xtzToTokenRight,
            xtzToTokenRight / 10 ** $store.tokens[tokenRight].decimals
          );*/
          tokenRightVortexVal = formatTokenAmount(
            (xtzToTokenRight + xtzToTokenRight * 0.0028) /
              10 ** $store.tokens[tokenRight].decimals,
            8
          ).toString();
          tokenRightVortexDetails = {
            minimumOut:
              (xtzToTokenRight - xtzToTokenRight * 0.005) /
              10 ** $store.tokens[tokenRight].decimals,
            fee:
              (xtzToTokenRight * 0.0028) /
              10 ** $store.tokens[tokenRight].decimals
          };
        }
      }

      loadingVortexResults = false;
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
            const val = ev.target.value;
            tokenLeftVal = val;
            await Promise.allSettled([
              estimatePlentySwap("left", val),
              estimateQuipuSwap("left", val),
              estimateVortexSwap("left", val)
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
                  estimateQuipuSwap("left", tokenLeftVal),
                  estimateVortexSwap("left", tokenLeftVal)
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
    <!-- QUIPUSWAP -->
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
    <!-- PLENTYSWAP -->
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
    <!--VORTEX -->
    <DexResults
      loading={loadingVortexResults}
      dex="vortex"
      {tokenLeft}
      {tokenRight}
      {tokenLeftVal}
      tokenRightVal={tokenRightVortexVal}
      tokenRightDetails={tokenRightVortexDetails}
      {mtdFee}
    />
  </div>
</section>
