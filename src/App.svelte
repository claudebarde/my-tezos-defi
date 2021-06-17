<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import store from "./store";
  import historicDataStore from "./historicDataStore";
  import Main from "./Main.svelte";
  import Header from "./lib/Header/Header.svelte";
  import Footer from "./lib/Footer/Footer.svelte";
  import QuipuWorker from "worker-loader!./quipuswap.worker";
  import LiveTrafficWorker from "worker-loader!./livetraffic.worker";
  import type { Operation, IconSet } from "./types";
  import { AvailableToken } from "./types";
  import config from "./config";
  import { shortenHash } from "./utils";

  let appReady = false;
  let quipuWorker, liveTrafficWorker;

  const handleQuipuWorker = (msg: MessageEvent) => {
    if (msg.data.type === "exchange-rates") {
      const exchangeRates = msg.data.payload;
      //console.log(exchangeRates);
      const updatedTokensExchangeRates = { ...$store.tokensExchangeRates };
      exchangeRates.forEach(rate => {
        if (rate) {
          const data = {
            tezToToken: rate[1],
            tokenToTez: rate[2]
          };
          updatedTokensExchangeRates[rate[0]] = data;
          // updates historic data
          historicDataStore.updateToken(rate[0], data);
        }
      });
      store.updateTokensExchangeRates(updatedTokensExchangeRates);

      if ($store.firstLoading) store.updateFirstLoading(false);
    } else if (msg.data.type === "xtz-fiat-exchange-rate") {
      store.updateXtzFiatExchangeRate(msg.data.payload);
    }
  };

  const calculateValue = (param, tokenName, tokenIds) => {
    //console.log(tokenSymbol, param);
    let tokenSymbol: AvailableToken;
    switch (tokenName) {
      case "WRAP Governance Token":
        tokenSymbol = AvailableToken.WRAP;
        break;
      default:
        tokenSymbol = tokenName;
        break;
    }

    let decimals = 1;
    if (
      $store.tokens.hasOwnProperty(tokenSymbol) &&
      $store.tokens[tokenSymbol].hasOwnProperty("decimals")
    ) {
      decimals = $store.tokens[tokenSymbol].decimals;
    } else if (
      tokenName === "Wrapped Tokens Contract" &&
      Array.isArray(tokenIds) &&
      tokenIds.length === 1
    ) {
      // WRAP tokens
      tokenSymbol = config.wrapTokenIds[tokenIds[0]].name;
      decimals = config.wrapTokenIds[tokenIds[0]].decimals;
    }

    if (Array.isArray(param)) {
      return (
        +(
          +[
            0,
            0,
            ...param
              .map(transfer => transfer.txs)
              .flat(1)
              .map(tx => +tx.amount)
          ].reduce((a, b) => a + b) /
          10 ** decimals
        ).toFixed(5) / 1
      );
    } else if (param.hasOwnProperty("value")) {
      return +(+param.value / 10 ** decimals).toFixed(5) / 1;
    } else {
      return 0;
    }
  };

  const findTokenId = (
    param: any,
    entrypoint: "transfer" | "update_operators"
  ): number[] | null => {
    if (entrypoint === "transfer") {
      if (Array.isArray(param) && param.length > 0) {
        return param.map(p => p.txs.map(tx => +tx.token_id)).flat();
      } else {
        return null;
      }
    } else if (entrypoint === "update_operators") {
      if (Array.isArray(param) && param.length > 0) {
        return param
          .map(p => {
            if (p.remove_operator) {
              return +p.remove_operator.token_id;
            } else if (p.add_operator) {
              return +p.add_operator.token_id;
            } else {
              return null;
            }
          })
          .filter(el => el)
          .flat();
      } else {
        return null;
      }
    }
  };

  const handleLiveTrafficWorker = (msg: MessageEvent) => {
    if (msg.data.type === "live-traffic") {
      /*const addresses = [
        ...Object.values($store.tokens).map(
          token => token.address[$store.network]
        ),
        ...Object.values($store.investments).map(
          entry => entry.address[$store.network]
        )
      ];*/
      const ops: Operation[] = [];
      msg.data.msg.forEach(op => {
        //console.log("Operation:", op);
        // finds token ids
        const tokenIds =
          op.parameter &&
          (op.parameter.entrypoint === "transfer" ||
            op.parameter.entrypoint === "update_operators")
            ? findTokenId(op.parameter.value, op.parameter.entrypoint)
            : null;
        // selects the right icon
        let icons: IconSet = [];
        switch (op.target.address) {
          case "KT1JQAZqShNMakSNXc2cgTzdAWZFemGcU6n1":
            icons = [AvailableToken.PLENTY, "XTZ"];
            break;
          case "KT1Ga15wxGR5oWK1vBG2GXbjYM6WqPgpfRSP":
            icons = [AvailableToken.PLENTY, AvailableToken.HDAO];
            break;
          case "KT1QqjR4Fj9YegB37PQEqXUPHmFbhz6VJtwE":
            icons = [AvailableToken.PLENTY, AvailableToken.PLENTY];
            break;
          case "KT19asUVzBNidHgTHp8MP31YSphooMb3piWR":
            icons = [AvailableToken.PLENTY, AvailableToken.ETHTZ];
            break;
          case "KT1MBqc3GHpApBXaBZyvY63LF6eoFyTWtySn":
            icons = [AvailableToken.PLENTY, AvailableToken.USDTZ];
            break;
          case "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6":
            icons = ["QUIPU", AvailableToken.KUSD];
            break;
          case "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA":
            icons = ["QUIPU", AvailableToken.KUSD];
            break;
          case "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z":
            icons = ["QUIPU", AvailableToken.PLENTY];
            break;
          case "KT1WxgZ1ZSfMgmsSDDcUn8Xn577HwnQ7e1Lb":
            icons = ["QUIPU", AvailableToken.USDTZ];
            break;
          case "KT1Evsp2yA19Whm24khvFPcwimK6UaAJu8Zo":
            icons = ["QUIPU", AvailableToken.ETHTZ];
            break;
          case "KT1LRboPna9yQY9BrjtQYDS1DVxhKESK4VVd":
            icons = [AvailableToken.WRAP];
            break;
          case "KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ":
            icons = tokenIds
              ? tokenIds.map(tokenId => config.wrapTokenIds[tokenId].name)
              : [AvailableToken.WRAP];
            break;
          case "KT19ovJhcsUn4YU8Q5L3BGovKSixfbWcecEA":
            icons = [AvailableToken.SDAO];
            break;
          default:
            icons = op.target.alias ? [op.target.alias.trim()] : ["user"];
            break;
        }

        ops.push({
          entryId: Math.round(Date.now() * Math.random()),
          id: op.id,
          hash: op.hash,
          level: +op.level,
          entrypoint: op.parameter ? op.parameter.entrypoint : "N/A",
          sender: {
            alias: op.sender.alias
              ? op.sender.alias.trim()
              : shortenHash(op.sender.address),
            address: op.sender.address
          },
          target: {
            alias: op.target.alias
              ? op.target.alias.trim()
              : shortenHash(op.target.address),
            address: op.target.address
          },
          amount: +op.amount,
          value:
            op.parameter && op.parameter.entrypoint === "transfer"
              ? calculateValue(
                  op.parameter.value,
                  op.target.alias.trim(),
                  tokenIds
                )
              : 0,
          icons,
          raw: op,
          tokenIds
        });
      });
      store.updateLastOperations(ops);
    }
  };

  onMount(async () => {
    const Tezos = new TezosToolkit($store.settings[$store.network].rpcUrl);
    Tezos.setPackerProvider(new MichelCodecPacker());
    store.updateTezos(Tezos);

    // inits Quipuswap worker
    quipuWorker = new QuipuWorker();
    quipuWorker.postMessage({
      type: "init",
      payload: {
        tokens: $store.tokens,
        rpcUrl: $store.settings[$store.network].rpcUrl,
        network: $store.network
      }
    });
    quipuWorker.onmessage = handleQuipuWorker;

    // inits live traffic worker
    liveTrafficWorker = new LiveTrafficWorker();
    liveTrafficWorker.onmessage = handleLiveTrafficWorker;

    // loads token storages
    /*const tokens = $store.tokens;
    const tokenContracts: TokenContract[] = Object.values(tokens);
    const storages = await Promise.all(
      tokenContracts.map(tk =>
        Tezos.wallet
          .at(tk.address[$store.network])
          .then(contract => contract.storage())
          .catch(_ => undefined)
      )
    );
    store.updateTokens(
      storages.map((storage, i) => {
        if (storage) {
          return [Object.keys(tokens)[i], { ...tokenContracts[i], storage }];
        }
      })
    );*/

    appReady = true;
  });

  onDestroy(() => {
    quipuWorker.postMessage({
      type: "destroy"
    });
  });
</script>

<style lang="scss">
  @import "./styles/settings.scss";

  #under-construction {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 0.5rem;
    text-align: center;
    padding: 15px;
    border: solid 1px #f9fafb;
    border-radius: 50%;
  }

  main {
    width: 70%;
    margin: 0 auto;
    min-height: 100%;
    margin-bottom: -100px;
  }

  @media only screen and (max-width: $mobile-break-point) {
    main {
      width: 100%;
    }

    #under-construction {
      display: none;
    }
  }
</style>

<Header />
<div id="under-construction">
  <span class="material-icons"> construction </span><br />
  <span>Under <br /> construction</span>
</div>
<main>
  {#if appReady}
    <Main />
  {:else}
    <div>Loading...</div>
  {/if}
</main>
<Footer />
