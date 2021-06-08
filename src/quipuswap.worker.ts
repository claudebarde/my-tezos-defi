import type { State } from "./types";
import { TezosToolkit } from "@taquito/taquito";
import {
  findDex,
  estimateTezInToken,
  estimateTokenInTez
} from "@quipuswap/sdk";

const ctx: Worker = self as any;
let localNetwork;

let getExchangeRatesInterval, xtzFiatExchangeRateInterval;
let Tezos: TezosToolkit;
let localTokens: State["tokens"];
let xtzFiatExchangeRate = 0;

const getTokensExchangeRates = async () => {
  const factories = {
    fa1_2Factory: [
      "KT1FWHLMk5tHbwuSsp31S4Jum4dTVmkXpfJw",
      "KT1Lw8hCoaBrHeTeMXbqHPG4sS4K1xn7yKcD"
    ],
    fa2Factory: [
      "KT1PvEyN1xCFCgorN92QCfYjw3axS6jawCiJ",
      "KT1SwH9P1Tx8a58Mm6qBExQFTcy2rwZyZiXS"
    ]
  };

  const exchangeRates = await Promise.all(
    Object.entries(localTokens).map(async localToken => {
      const [tokenSymbol, tokenInfo] = localToken;
      let token;
      if (tokenInfo.type === "fa2") {
        token = {
          contract: tokenInfo.address[localNetwork],
          id: 0
        };
      } else {
        token = { contract: tokenInfo.address[localNetwork] };
      }

      try {
        const dex = await findDex(Tezos, factories, token);
        if (dex) {
          const dexStorage = await dex.contract.storage();
          const tokenValue = 1 * 10 ** tokenInfo.decimals;
          const inTezValue = estimateTezInToken(dexStorage, tokenValue);
          const inTokenValue = estimateTokenInTez(dexStorage, 1_000_000);

          /*console.info(
            `1 ${tokenSymbol} = ${inTezValue.toNumber() / 10 ** 6} XTZ`
          );
          console.info(
            `1 XTZ = ${
              inTokenValue.toNumber() / 10 ** tokenInfo.decimals
            } ${tokenSymbol}`
          );*/

          if (tokenSymbol === "tzBTC") {
            console.log(inTokenValue.toNumber(), inTezValue.toNumber());
          }

          return [
            tokenSymbol,
            (inTokenValue.toNumber() / 10 ** tokenInfo.decimals).toFixed(5),
            (inTezValue.toNumber() / 10 ** 6).toFixed(5)
          ];
        } else {
          console.error(tokenSymbol, "no dex");
          return undefined;
        }
      } catch (err) {
        console.error(err);
        return undefined;
      }
      /*const dexContract = await Tezos.wallet.at(token.dexContractAddress);
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
    })*/
    })
  );

  ctx.postMessage({ type: "exchange-rates", payload: exchangeRates });
};

const fetchXtzFiatExchangeRate = async () => {
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
  localNetwork = network;
  Tezos = new TezosToolkit(rpcUrl);

  // sets up fetching tokens exchange rates
  await getTokensExchangeRates();
  getExchangeRatesInterval = setInterval(getTokensExchangeRates, 60000);
  // sets up fetching XTZ-USD exchange rate
  await fetchXtzFiatExchangeRate();
  xtzFiatExchangeRateInterval = setInterval(fetchXtzFiatExchangeRate, 60000);
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
