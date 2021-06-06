import type { State } from "./types";
import { TezosToolkit } from "@taquito/taquito";
import {
  estimateSwap,
  estimateTezToToken,
  estimateTokenToTez
} from "@quipuswap/sdk";

const ctx: Worker = self as any;
const FEE_FACTOR = 997;

let getExchangeRatesInterval, xtzFiatExchangeRateInterval;
let Tezos: TezosToolkit;
let localTokens: State["tokens"];
let xtzFiatExchangeRate = 0;

const getTokensExchangeRates = async () => {
  const exchangeRates = await Promise.all(
    Object.values(localTokens).map(async (token, i) => {
      const tokenSymbol = Object.keys(localTokens)[i];
      const dexContract = await Tezos.wallet.at(token.dexContractAddress);
      const dexStorage: any = await dexContract.storage();

      const tezValue = 1;
      const tokenValue = 1;
      const tezToToken =
        estimateTezToToken(dexStorage, tezValue * 10 ** 6).toNumber() /
        10 ** token.decimals;
      const tokenToTez = (tezValue * tokenValue) / tezToToken;

      return [
        tokenSymbol,
        +parseFloat(tezToToken.toString()).toFixed(7),
        +parseFloat(tokenToTez.toString()).toFixed(7)
      ];

      /*
      const tokenInWithFee = tokenValue * FEE_FACTOR;
      const numerator = tokenInWithFee * dexStorage.storage.tez_pool.toNumber();
      const denominator =
        dexStorage.storage.token_pool.toNumber() * 1000 + tokenInWithFee;
      const exchangeRate = numerator / denominator;
      console.log(
        tokenSymbol,
        exchangeRate * 10 ** 18,
        exchangeRate.toString().slice(0, 7)
      );
      return [tokenSymbol, exchangeRate.toString().slice(0, 7)];*/
    })
  );

  ctx.postMessage({ type: "exchange-rates", payload: exchangeRates });
};

const fetchxtzFiatExchangeRate = async () => {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=tezos&vs_currencies=usd`
    );
    if (response) {
      const data = await response.json();
      xtzFiatExchangeRate = +data.tezos.usd;

      ctx.postMessage({
        type: "xtz-fiat-exchange-rate",
        payload: xtzFiatExchangeRate
      });
    } else {
      throw "No response from CoinGecko API";
    }
  } catch (error) {
    console.log(error);
    return;
  }
};

const init = async (param: {
  tokens: State["tokens"];
  rpcUrl: string;
  network: State["network"];
}) => {
  const { tokens, rpcUrl, network } = param;
  localTokens = tokens;
  Tezos = new TezosToolkit(rpcUrl);

  // sets up fetching tokens exchange rates
  await getTokensExchangeRates();
  getExchangeRatesInterval = setInterval(getTokensExchangeRates, 60000);
  // sets up fetching XTZ-USD exchange rate
  await fetchxtzFiatExchangeRate();
  xtzFiatExchangeRateInterval = setInterval(fetchxtzFiatExchangeRate, 60000);

  /*const factories = {
    PLENTY: {
      fa1_2Factory: "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z", //"KT1K7whn5yHucGXMN7ymfKiX5r534QeaJM29",
      fa2Factory: "KT1DVRF9Y129gjZ7n8ye74JVTqLTvgcb8TcS"
    }
  };

  try {
    const fromAsset = {
      contract: "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b"
    };
    const toAsset = "tez";
    const inputValue = 1;

    const estimatedOutputValue = await estimateSwap(
      tezos,
      factories.PLENTY,
      fromAsset,
      toAsset,
      { inputValue }
    );

    console.info({ estimatedOutputValue });
  } catch (err) {
    console.error(err);
  }*/
  /*const { tokens, rpcUrl, network } = param;
  Tezos = new TezosToolkit(rpcUrl);
  const factories = {
    testnet: {
      fa1_2Factory: "KT1WkKiDSsDttdWrfZgcQ6Z9e3Cp4unHP2CP",
      fa2Factory: "KT1Bps1VtszT2T3Yvxm5PJ6Rx2nk1FykWPdU"
    },
    mainnet: {
      fa1_2Factory: "KT1K7whn5yHucGXMN7ymfKiX5r534QeaJM29",
      fa2Factory: "KT1DVRF9Y129gjZ7n8ye74JVTqLTvgcb8TcS"
    }
  };

  try {
    const fromAsset = "tez";
    const toAsset =
      tokens.PLENTY.type === "fa1.2"
        ? { contract: tokens.PLENTY.address[network] }
        : { contract: tokens.PLENTY.address[network], id: 0 };
    const inputValue = 1_000_000; // in mutez (without decimals)

    console.log(rpcUrl, factories[network], toAsset);

    const estimatedOutputValue = await estimateSwap(
      Tezos,
      factories[network],
      fromAsset,
      toAsset,
      { inputValue }
    );

    console.info({ estimatedOutputValue });
  } catch (err) {
    console.error(err);
  }*/
};

ctx.addEventListener("message", async e => {
  // removes current interval
  if (e.data.type === "init") {
    await init(e.data.payload);
  } else if (e.data.type === "destroy") {
    clearInterval(getExchangeRatesInterval);
    clearInterval(xtzFiatExchangeRateInterval);
  }
});

ctx.postMessage("Quipu worker ready");

export {};
