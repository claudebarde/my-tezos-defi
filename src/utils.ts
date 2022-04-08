import type { TezosToolkit } from "@taquito/taquito";
import { bytes2Char } from "@taquito/utils";
import { get } from "svelte/store";
import BigNumber from "bignumber.js";
import type {
  AvailableFiat,
  HistoricalDataState,
  AvailableToken,
  State,
  TezosAccountAddress,
  TezosContractAddress,
  UserToken
} from "./types";
import store from "./store";

export const shortenHash = (hash: string): string =>
  hash ? hash.slice(0, 5) + "..." + hash.slice(-5) : "";

export const formatTokenAmount = (
  amount: number,
  decimals?: number
): number => {
  if (decimals) {
    return amount ? +amount.toFixed(decimals) / 1 : 0;
  } else {
    return amount ? +amount.toFixed(5) / 1 : 0;
  }
};

export const fetchTezosDomain = async (
  Tezos: TezosToolkit,
  address: string
): Promise<string> => {
  try {
    const contract = await Tezos.wallet.at(
      "KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS"
    );
    const storage: any = await contract.storage();
    const user = await storage.store.reverse_records.get(address);
    if (user) {
      return bytes2Char(user.name);
    } else {
      return address.slice(0, 5) + "..." + address.slice(-5);
    }
  } catch (error) {
    console.error(
      "Failed to fetch Tezos domain contract or username with error:",
      error
    );
    return address.slice(0, 5) + "..." + address.slice(-5);
  }
};

export const coinGeckoFetch = async (
  preferredFiat: AvailableFiat
): Promise<{
  exchangeRate: number;
  priceHistoric: Array<{ timestamp: string; price: number }>;
}> => {
  const url = `https://api.coingecko.com/api/v3/coins/tezos/market_chart?vs_currency=${preferredFiat}&days=30&interval=daily`;
  const coinGeckoResponse = await fetch(url);
  if (coinGeckoResponse) {
    const data = await coinGeckoResponse.json();
    const prices = data.prices as Array<[string, number]>;
    const xtzFiatExchangeRate = prices[prices.length - 1][1];
    const priceHistoric = prices.map(price => ({
      timestamp: new Date(price[0]).toISOString(),
      price: price[1]
    }));
    //store.updateXtzFiatExchangeRate(xtzFiatExchangeRate);
    //store.updateXtzDataHistoric(
    return { exchangeRate: xtzFiatExchangeRate, priceHistoric };
  } else {
    throw "No response from CoinGecko API";
  }
};

export const calculateTrend = (
  tokenData:
    | HistoricalDataState["tokens"][AvailableToken]
    | State["xtzPriceHistoric"],
  tokenSymbol: AvailableToken | "XTZ"
) => {
  let trend: "same" | "up" | "down", nrOfTrends: number;
  // calculates new trend
  //const tokenData = historicalData.tokens[tokenSymbol];
  tokenData.sort((a, b) => a.timestamp - b.timestamp);
  const upsAndDowns = tokenData.map((el, index) => {
    if (index === 0) {
      // first element of the array, nothing to do with it
      return { direction: "same", diff: 0 };
    } else {
      const previousEl: any = tokenData[index - 1];
      const rate = tokenSymbol === "XTZ" ? +el.rate : +el.rate.tokenToTez;
      const previousRate =
        tokenSymbol === "XTZ" ? +previousEl.rate : +previousEl.rate.tokenToTez;
      if (rate === previousRate) {
        return { direction: "same", diff: 0 };
      } else if (rate > previousRate) {
        // price went up
        return {
          direction: "up",
          diff: rate - previousRate
        };
      } else {
        return {
          direction: "down",
          diff: previousRate - rate
        };
      }
    }
  });
  //console.log(tokenSymbol, JSON.stringify(upsAndDowns));
  /*const counts = upsAndDowns.reduce(
    (prev, cur) => {
      prev[cur.direction] = (prev[cur.direction] || 0) + 1;
      return prev;
    },
    { up: 0, down: 0, same: 0 }
  );*/
  let diffUp = 0;
  let diffDown = 0;
  upsAndDowns.forEach(val => {
    if (val.direction === "up") {
      diffUp += +val.diff;
    } else if (val.direction === "down") {
      diffDown += +val.diff;
    }
  });

  if (diffUp === diffDown) {
    trend = "same";
  } else if (diffUp > diffDown) {
    trend = "up";
  } else {
    trend = "down";
  }
  nrOfTrends = tokenData.length;
  /*console.log(
          token[0],
          historicalData.tokens[token[0]],
          upsAndDowns,
          counts,
          trend
        );*/

  return { trend, nrOfTrends };
};

export const tzktTokensFetch = async (
  userAddress: TezosAccountAddress,
  tokensToKeep: Array<AvailableToken>
): Promise<Array<UserToken> | null> => {
  try {
    const res = await fetch(
      `https://api.tzkt.io/v1/tokens/balances?account=${userAddress}&limit=400`
    );
    if (res) {
      const tokensList = await res.json();
      // filters tokens
      const tokens = tokensList
        .filter(tk => +tk.balance > 0)
        .filter(
          tk =>
            tk.hasOwnProperty("token") &&
            tk.token.hasOwnProperty("metadata") &&
            tk.token.metadata.hasOwnProperty("symbol") &&
            tokensToKeep.includes(tk.token.metadata.symbol)
        )
        .map(tk => ({
          name: tk.token.metadata.symbol,
          exchangeRate: 0,
          balance: +tk.balance
        }));

      return tokens;
    } else {
      throw "No response from TzKT";
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

interface DefiData {
  tokens: Omit<State["tokens"], "exchangeRate" | "thumbnail" | "websiteLink">;
  investments: any;
}
export const fetchDefiData = async (
  ipfsHash: string,
  mtdVersion: string,
  force?: boolean
): Promise<DefiData | null> => {
  const ipfsGatewayUrls = [
    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
    `https://dweb.link/ipfs/${ipfsHash}`
  ];
  const response = await Promise.race(ipfsGatewayUrls.map(url => fetch(url)));
  if (response) {
    return await response.json();
  } else {
    return null;
  }

  /*const ipfsRequest = async (mtdCache?: Cache): Promise<DefiData> => {
    const defiDataResponse = await fetch(request);
    if (defiDataResponse) {
      const defiData: DefiData = await defiDataResponse.json();
      if (mtdCache) {
        mtdCache.add(request);
      }
      return defiData;
    } else {
      throw "No response from IPFS";
    }
  };

  if (window && "caches" in window && !force) {
    const newCache = await caches.open("mtd-cache");
    try {
      const cacheResponse = await newCache.match(request);
      if (cacheResponse) {
        const mtdCache = await cacheResponse.json();
        // file is downloaded again if the cached version of MTD is different from the current version
        if (mtdCache["mtd-version"] === mtdVersion) {
          console.log("cached defi data:", ipfsHash);
          const previousRequestsToDelete = [
            "https://gateway.pinata.cloud/ipfs/QmT3Joq9XE8pS8bsXBEzP4jqSBjsXpfPc5AqRHQexKW6NG",
            "https://gateway.pinata.cloud/ipfs/QmSsspv7rsPjovuRHruGnn6ZMp6ojdoUhKYnneTbr4FPt8",
            "https://gateway.pinata.cloud/ipfs/QmPjNpRH3DsRCfDyg8buzxbTGtNrm7EvkjH51xokzTqF5L",
            "https://gateway.pinata.cloud/ipfs/QmcuBXLSVW5Eeca81fM7EB5y36RtbEyh1VajE7KTAKK93g"
          ];
          // cleans up old caches
          await Promise.allSettled(
            previousRequestsToDelete.map(req => newCache.delete(req))
          );

          return mtdCache;
        } else {
          console.log("new defi data:", ipfsHash);
          // deletes the current cache before fetching the new version of the defi data
          await newCache.delete(request);
          return await ipfsRequest(newCache);
        }
      } else {
        // loads last successful request before trying to load the new one
        const keys = await newCache.keys();
        const lastCachedRequest = keys[keys.length - 1];
        console.warn(
          "couldn't fetch new defi data, loading cache for:",
          lastCachedRequest.url
        );
        const cacheResponse = await newCache.match(lastCachedRequest);
        if (cacheResponse) {
          await ipfsRequest(newCache);
          return await cacheResponse.json();
        } else {
          return await ipfsRequest(newCache);
        }
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  } else if (window && "caches" in window && force) {
    console.log("force download new defi data");
    const newCache = await caches.open("mtd-cache");
    try {
      return await ipfsRequest(newCache);
    } catch (error) {
      console.error(error);
      return null;
    }
  } else {
    try {
      return await ipfsRequest();
    } catch (error) {
      console.error(error);
      return null;
    }
  }*/
};

export const sortTokensByBalance = (tokens: [AvailableToken, number][]) => {
  const localStore = get(store);

  return tokens.sort((a, b) => {
    let balanceA = a[1];
    let balanceB = b[1];
    if (balanceA === undefined) {
      balanceA = 0;
    } else if (balanceB === undefined) {
      balanceB = 0;
    }

    if (
      !localStore.tokens ||
      !localStore.tokens[a[0]].exchangeRate ||
      !localStore.tokens[b[0]].exchangeRate
    ) {
      return 0;
    }

    return (
      balanceB *
        (localStore.tokens[b[0]].exchangeRate
          ? localStore.tokens[b[0]].exchangeRate
          : 0) -
      balanceA *
        (localStore.tokens[a[0]].exchangeRate
          ? localStore.tokens[a[0]].exchangeRate
          : 0)
    );
  });
};

export const estimateQuipuTezInShares = async (
  Tezos: TezosToolkit,
  dexAddress: string,
  shares: BigNumber.Value
) => {
  const sharesBN = new BigNumber(shares);
  if (sharesBN.isZero()) return new BigNumber(0);

  const contract = await Tezos.wallet.at(dexAddress);
  const storage: any = await contract.storage();

  return sharesBN
    .times(storage.storage.tez_pool)
    .idiv(storage.storage.total_supply);
};

export const estimateQuipuTokenInShares = async (
  Tezos: TezosToolkit,
  dexAddress: string,
  shares: BigNumber.Value
) => {
  const sharesBN = new BigNumber(shares);
  if (sharesBN.isZero()) return new BigNumber(0);

  const contract = await Tezos.wallet.at(dexAddress);
  const storage: any = await contract.storage();

  return sharesBN
    .times(storage.storage.token_pool)
    .idiv(storage.storage.total_supply);
};

export const getKdaoReward = async (
  farmAddress: TezosContractAddress,
  userAddress: TezosAccountAddress,
  currentBlockHeight: number
): Promise<BigNumber | null> => {
  const localStore = get(store);
  if (!farmAddress || !userAddress || !currentBlockHeight) return null;

  const contract = await localStore.Tezos.wallet.at(farmAddress);
  const farmContractData: any = await contract.storage();
  const depositedTokens = await farmContractData.delegators.get(userAddress);

  if (
    depositedTokens === undefined ||
    depositedTokens.lpTokenBalance.isZero()
  ) {
    return new BigNumber(0);
  }
  const accRewardPerShareStart = depositedTokens.accumulatedRewardPerShareStart;
  const nextBlock = new BigNumber(currentBlockHeight + 1);
  const multiplier = nextBlock.minus(farmContractData.farm.lastBlockUpdate);
  const outstandingReward = multiplier.times(
    farmContractData.farm.plannedRewards.rewardPerBlock
  );
  const claimedRewards = farmContractData.farm.claimedRewards.paid.plus(
    farmContractData.farm.claimedRewards.unpaid
  );
  const totalRewards = outstandingReward.plus(claimedRewards);
  const plannedRewards =
    farmContractData.farm.plannedRewards.rewardPerBlock.times(
      farmContractData.farm.plannedRewards.totalBlocks
    );
  const totalRewardsExhausted = totalRewards.isGreaterThan(plannedRewards);
  const reward = totalRewardsExhausted
    ? plannedRewards.minus(claimedRewards)
    : outstandingReward;
  const lpMantissa = new BigNumber(10).pow(36);
  const rewardRatio = reward
    .times(lpMantissa)
    .div(farmContractData.farmLpTokenBalance);
  const accRewardPerShareEnd =
    farmContractData.farm.accumulatedRewardPerShare.plus(rewardRatio);
  const accumulatedRewardPerShare = accRewardPerShareEnd.minus(
    accRewardPerShareStart
  );

  const result = accumulatedRewardPerShare
    .times(depositedTokens.lpTokenBalance)
    .dividedBy(lpMantissa);

  if (result.toNumber() < 0) {
    return new BigNumber(0);
  } else {
    return result;
  }
};
