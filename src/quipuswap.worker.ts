import type { State } from "./types";
import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { findDex, estimateSwap } from "@quipuswap/sdk";
import config from "./config";

const ctx: Worker = self as any;
let localNetwork;

let getExchangeRatesInterval, xtzFiatExchangeRateInterval;
let Tezos: TezosToolkit;
let localTokens: State["tokens"];
let xtzFiatExchangeRate = 0;

const getTokensExchangeRates = async () => {
  const factories = config.quipuswapFactories;

  const exchangeRates = await Promise.all(
    Object.entries(localTokens).map(async localToken => {
      const [tokenSymbol, tokenInfo] = localToken;
      let token;
      if (tokenInfo.type === "fa2") {
        if (
          Array.isArray(tokenInfo.ledgerKey) &&
          tokenInfo.ledgerKey[0] === "address" &&
          !isNaN(+tokenInfo.ledgerKey[1])
        ) {
          token = {
            contract: tokenInfo.address[localNetwork],
            id: tokenInfo.ledgerKey[1]
          };
        } else {
          token = {
            contract: tokenInfo.address[localNetwork],
            id: 0
          };
        }
      } else {
        token = { contract: tokenInfo.address[localNetwork] };
      }

      try {
        const dex = await findDex(Tezos, factories, token);
        if (dex) {
          const tokenValue = 1 * 10 ** tokenInfo.decimals;

          const estimatedTokenToTezSwap = await estimateSwap(
            Tezos,
            factories,
            token,
            "tez",
            {
              inputValue: tokenValue
            }
          );
          const estimatedTezToTokenSwap = await estimateSwap(
            Tezos,
            factories,
            "tez",
            token,
            {
              inputValue: 1_000_000
            }
          );

          return [
            tokenSymbol,
            +(
              estimatedTezToTokenSwap.toNumber() /
              10 ** tokenInfo.decimals
            ).toFixed(5) / 1,
            +(estimatedTokenToTezSwap.toNumber() / 10 ** 6).toFixed(5) / 1
          ];
        } else {
          console.error(tokenSymbol, "no dex");
          return undefined;
        }
      } catch (err) {
        console.error(
          `Error fetching the exchange rate for ${tokenSymbol}:`,
          err
        );
        return undefined;
      }
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
  Tezos.setPackerProvider(new MichelCodecPacker());

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
