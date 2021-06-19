import type { TezosToolkit } from "@taquito/taquito";
import type {
  HistoricalDataState,
  TokenContract,
  TezosAccountAddress,
  TezosContractAddress,
  State,
  Operation,
  IconValue,
  IconSet
} from "./types";
import { AvailableToken } from "./types";
import { char2Bytes } from "@taquito/utils";
import config from "./config";
import { get } from "svelte/store";
import store from "./store";

const localStore = get(store);

// outputs "down" while visually looking like "up"
const testUpsAndDownsData = [
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "up", diff: 0.02668999999999999 },
  { direction: "down", diff: 0.00008000000000008001 },
  { direction: "down", diff: 0.00002999999999997449 },
  { direction: "down", diff: 0.00002999999999997449 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 }
];

export const calculateTrend = (
  historicalData: HistoricalDataState,
  tokenSymbol: AvailableToken
) => {
  let trend: "same" | "up" | "down", nrOfTrends: number;
  // calculates new trend
  const tokenData = historicalData.tokens[tokenSymbol];
  tokenData.sort((a, b) => a.timestamp - b.timestamp);
  const upsAndDowns = tokenData.map((el, index) => {
    if (index === 0) {
      // first element of the array, nothing to do with it
      return { direction: "same", diff: 0 };
    } else {
      const previousEl = tokenData[index - 1];
      if (+el.rate.tokenToTez === +previousEl.rate.tokenToTez) {
        return { direction: "same", diff: 0 };
      } else if (+el.rate.tokenToTez > +previousEl.rate.tokenToTez) {
        // price went up
        return {
          direction: "up",
          diff: +el.rate.tokenToTez - +previousEl.rate.tokenToTez
        };
      } else {
        return {
          direction: "down",
          diff: +previousEl.rate.tokenToTez - +el.rate.tokenToTez
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
  nrOfTrends = historicalData.tokens[tokenSymbol].length;
  /*console.log(
          token[0],
          historicalData.tokens[token[0]],
          upsAndDowns,
          counts,
          trend
        );*/

  return { trend, nrOfTrends };
};

export const shortenHash = (hash: string): string =>
  hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";

export const searchUserTokens = async ({
  Tezos,
  network,
  userAddress,
  tokens,
  tokensBalances
}: {
  Tezos: TezosToolkit;
  network: State["network"];
  userAddress: TezosAccountAddress;
  tokens: State["tokens"] | { [p: string]: TokenContract };
  tokensBalances: State["tokensBalances"];
}) => {
  // search for user address in tokens ledgers
  const balances = await Promise.all(
    Object.entries(tokens).map(async (tokenInfo, i) => {
      const [tokenSymbol, token] = tokenInfo;
      const contract = await Tezos.wallet.at(token.address[network]);
      const storage = await contract.storage();
      // finds ledger in storage
      const ledgerPath = token.ledgerPath.split("/");
      const ledger =
        ledgerPath.length === 1
          ? storage[ledgerPath[0]]
          : [storage, ...ledgerPath].reduce(
              (storage: any, sub: any) => storage[sub]
            );
      //return [Object.keys($store.tokens)[i], ledger];
      let balance;
      if (
        token.ledgerKey === "address" &&
        (token.type == "fa1.2" || token.type == "fa2")
      ) {
        const user = await ledger.get(userAddress);
        if (user) {
          if (user.hasOwnProperty("balance")) {
            balance = user.balance.toNumber() / 10 ** token.decimals;
          } else {
            balance = user.toNumber() / 10 ** token.decimals;
          }
        } else {
          balance = undefined;
        }
      } else if (
        Array.isArray(token.ledgerKey) &&
        token.ledgerKey[0] === "address"
      ) {
        balance = await ledger.get({ 0: userAddress, 1: token.ledgerKey[1] });
        if (balance) {
          balance = balance.toNumber() / 10 ** token.decimals;
        }
      } else if (
        Array.isArray(token.ledgerKey) &&
        token.ledgerKey[1] === "address"
      ) {
        balance = await ledger.get(
          char2Bytes(`{ Pair "ledger" "${userAddress}" }`)
        );
      } else {
        balance = undefined;
      }

      return [tokenSymbol, balance];
    })
  );
  // updates token balances
  const newBalances = { ...tokensBalances };
  balances.forEach(param => {
    newBalances[param[0]] = param[1];
  });

  return newBalances;
};

export const findTokenId = (
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

export const getTokenIds = opParam => {
  return opParam &&
    (opParam.entrypoint === "transfer" ||
      opParam.entrypoint === "update_operators")
    ? findTokenId(opParam.value, opParam.entrypoint)
    : null;
};

export const getOpIcons = (
  param,
  target: {
    address: TezosAccountAddress | TezosContractAddress;
    alias: IconValue;
  }
) => {
  const tokenIds = getTokenIds(param);
  let icons: IconSet = [];
  switch (target.address) {
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
    case "KT1RRgK6eXvCWCiEGWhRZCSVGzhDzwXEEjS4":
      icons = ["QUIPU", AvailableToken.CRUNCH];
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
    case "KT1KnuE87q1EKjPozJ5sRAjQA24FPsP57CE3":
      icons = ["crDAO"];
      break;
    default:
      icons = target.alias ? [target.alias.trim() as IconValue] : ["user"];
      break;
  }

  return icons;
};

export const calculateValue = (param, tokenName, tokenIds, tokens) => {
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
    tokens.hasOwnProperty(tokenSymbol) &&
    tokens[tokenSymbol].hasOwnProperty("decimals")
  ) {
    decimals = tokens[tokenSymbol].decimals;
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

export const createNewOpEntry = (
  op: any,
  tokens: State["tokens"]
): Operation => {
  const tokenIds = getTokenIds(op.param);
  const icons = getOpIcons(op.param, op.target);

  let alias = shortenHash(op.target.address);
  if (op.target.alias) {
    // if alias is provided by BCD
    alias = op.target.alias;
  } else {
    // check if alias is available in app
    const invInfo = Object.values(localStore.investments).find(
      inv => inv.address[localStore.network] === op.target.address
    );
    if (invInfo) {
      alias = invInfo.alias;
    }
  }

  return {
    entryId: Math.round(Date.now() * Math.random()),
    id: op.id,
    hash: op.hash,
    level: +op.level,
    timestamp: op.timestamp,
    entrypoint: op.parameter ? op.parameter.entrypoint : "N/A",
    sender: {
      alias: op.sender.alias
        ? op.sender.alias.trim()
        : shortenHash(op.sender.address),
      address: op.sender.address
    },
    target: {
      alias: alias,
      address: op.target.address
    },
    amount: +op.amount,
    value:
      op.parameter && op.parameter.entrypoint === "transfer"
        ? calculateValue(
            op.parameter.value,
            op.target.alias.trim(),
            getTokenIds(op.param),
            tokens
          )
        : 0,
    icons,
    raw: op,
    tokenIds
  };
};
