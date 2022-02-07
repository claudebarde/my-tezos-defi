<script lang="ts">
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import { formatTokenAmount } from "../../utils";

  type dexName = "quipu" | "plenty" | "vortex";

  export let loading: boolean,
    dex: dexName,
    tokenLeft: string,
    tokenRight: string,
    tokenLeftVal: string,
    tokenRightVal: string,
    tokenRightDetails: { minimumOut: number; fee: number },
    mtdFee: number,
    bestRate: boolean;

  let loadingResults = false;
  let maxTokenRight: number | null = null;

  const dexName = (dex: dexName): string => {
    if (dex === "plenty") {
      return "PlentySwap";
    } else if (dex === "quipu") {
      return "QuipuSwap";
    } else if (dex === "vortex") {
      return "Vortex";
    } else {
      return "N/A";
    }
  };
  const dexSymbol = (dex: dexName): string => {
    if (dex === "plenty") {
      return "PLENTY";
    } else if (dex === "quipu") {
      return "QUIPU";
    } else if (dex === "vortex") {
      return "SMAK";
    } else {
      return "N/A";
    }
  };
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

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
          border-radius: 50%;
          border: solid 4px transparent;
          padding: 2px;

          &.loading {
            -webkit-animation: heartbeat 1.5s ease-in-out infinite both;
            animation: heartbeat 1.5s ease-in-out infinite both;
          }

          &.best-rate {
            border-color: $success-green;
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
</style>

<div class="swaps-inputs__input">
  <div class="swaps-inputs__input__result">
    <div class="swaps-inputs__input__result__title">
      <div>{dexName(dex)}</div>
      <img
        src={`images/${dexSymbol(dex)}.png`}
        alt="vortex"
        class:loading
        class:best-rate={bestRate}
      />
    </div>
    <div class="swaps-inputs__input__result__output">
      <input type="text" value={tokenRightVal} readonly />
      <div class="swaps-inputs__input__result__details">
        <button>
          Balance: {maxTokenRight ?? "--"}
        </button>
        {#if tokenRightVal}
          <div>
            ~{formatTokenAmount(
              +tokenRightVal *
                $store.tokens[tokenRight].exchangeRate *
                $store.xtzData.exchangeRate,
              2
            )}
            {$localStorageStore.preferredFiat}
          </div>
        {/if}
      </div>
      <br />
      <button class="primary" disabled={!tokenRightVal}>Swap</button>
    </div>
    {#if tokenRightDetails}
      <div class="swaps-inputs__input__result__info">
        <div>
          Minimum out: {formatTokenAmount(tokenRightDetails.minimumOut)}
        </div>
        <div>
          Difference: {formatTokenAmount(
            Math.abs(
              +tokenLeftVal *
                $store.tokens[tokenLeft].exchangeRate *
                $store.xtzData.exchangeRate -
                +tokenRightVal *
                  $store.tokens[tokenRight].exchangeRate *
                  $store.xtzData.exchangeRate
            )
          )}
          {$localStorageStore.preferredFiat}
        </div>
        <div>
          Fee: {formatTokenAmount(tokenRightDetails.fee)}
        </div>
        <div>
          MTD fee: {formatTokenAmount(mtdFee)} XTZ
        </div>
      </div>
    {/if}
  </div>
</div>
