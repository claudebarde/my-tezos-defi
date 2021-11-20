import type {
  TezosToolkit,
  ContractMethod,
  Wallet,
  WalletOperationBatch
} from "@taquito/taquito";
import { packDataBytes, unpackDataBytes } from "@taquito/michel-codec";
import { bytes2Char } from "@taquito/utils";
import BigNumber from "bignumber.js";
import type {
  HistoricalDataState,
  TokenContract,
  TezosAccountAddress,
  TezosContractAddress,
  State,
  Operation,
  IconValue,
  IconSet,
  KolibriOvenData
} from "./types";
import { AvailableToken, AvailableInvestments } from "./types";
import { char2Bytes } from "@taquito/utils";
import config from "./config";
import { get } from "svelte/store";
import store from "./store";

export const calculateTrend = (
  tokenData:
    | HistoricalDataState["tokens"][AvailableToken]
    | State["xtzData"]["historic"],
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

export const shortenHash = (hash: string): string =>
  hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";

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

const findTzbtcBalance = async (
  ledger,
  userAddress,
  decimals
): Promise<number> => {
  const packedAddress = packDataBytes(
    { string: userAddress },
    { prim: "address" }
  );
  const ledgerKey: any = {
    prim: "Pair",
    args: [{ string: "ledger" }, { bytes: packedAddress.bytes.slice(12) }]
  };
  const ledgerKeyBytes = packDataBytes(ledgerKey);
  const bigmapVal = await ledger.get(ledgerKeyBytes.bytes);
  if (bigmapVal) {
    const bigmapValData = unpackDataBytes({ bytes: bigmapVal });
    if (
      bigmapValData.hasOwnProperty("prim") &&
      (bigmapValData as any).prim === "Pair"
    ) {
      return +(bigmapValData as any).args[0].int / 10 ** decimals;
    } else {
      return 0;
    }
  } else {
    return 0;
  }
};

export const searchUserTokens = async ({
  Tezos,
  userAddress,
  tokens
}: {
  Tezos: TezosToolkit;
  userAddress: TezosAccountAddress;
  tokens: [AvailableToken | string, TokenContract][];
}) => {
  try {
    if (!tokens) return null;

    const newBalances: Partial<State["tokensBalances"]> = {};

    const url = (contractAddress, ledgerName, userAddress) =>
      `https://api.tzkt.io/v1/contracts/${contractAddress}/bigmaps/${ledgerName}/keys/${userAddress}`;
    // tokens with a "balances" bigmap
    const balancesContracts = await Promise.allSettled(
      tokens
        .filter(tk => tk[1].ledgerPath === "balances")
        .map(tk =>
          fetch(url(tk[1].address, "balances", userAddress))
            .then(res => res.json())
            .then(val => ({ ...val, token: tk[0] }))
            .catch(err => undefined)
        )
    );
    // tokens with a "ledger" bigmap
    const ledgerContracts = await Promise.allSettled(
      tokens
        .filter(tk => tk[1].ledgerPath.includes("ledger"))
        .map(tk => {
          let key = userAddress as string;
          if (Array.isArray(tk[1].ledgerKey) && !isNaN(+tk[1].ledgerKey[1])) {
            key = `{"address":"${userAddress}","nat":"${tk[1].ledgerKey[1]}"}`;
          }
          if (tk[0] === "uUSD" || tk[0] === "YOU") {
            key = `{"owner":"${userAddress}","token_id":"${tk[1].ledgerKey[1]}"}`;
          }

          return fetch(url(tk[1].address, "ledger", key))
            .then(res => res.json())
            .then(val => ({ ...val, token: tk[0] }))
            .catch(err => undefined);
        })
    );
    // tzBTC
    if (tokens.find(tk => tk[0] === "tzBTC")) {
      const token = tokens.find(tk => tk[0] === "tzBTC");
      const contract = await Tezos.wallet.at(token[1].address);
      const storage = await contract.storage();
      newBalances.tzBTC = await findTzbtcBalance(
        storage["0"],
        userAddress,
        token[1].decimals
      );
    }
    // QUIPU
    if (tokens.find(tk => tk[0] === "QUIPU")) {
      const token = tokens.find(tk => tk[0] === "QUIPU");
      const balanceResponse = await fetch(
        url(token[1].address, "account_info", userAddress)
      );
      const balance = await balanceResponse.json();
      if (balance.active) {
        const balances: { [p: number]: string } = balance.value.balances;
        newBalances.QUIPU =
          +[0, 0, Object.values(balances)].reduce((a, b) => +a + +b) /
          10 ** token[1].decimals;
      } else {
        newBalances.QUIPU = 0;
      }
    }
    // cTEZ
    if (tokens.find(tk => tk[0] === "cTEZ")) {
      const token = tokens.find(tk => tk[0] === "cTEZ");
      const balanceResponse = await fetch(
        url(token[1].address, token[1].ledgerPath, userAddress)
      );
      const balance = await balanceResponse.json();
      if (balance && balance.active && +balance?.value > 0) {
        newBalances.cTEZ = +balance.value / 10 ** token[1].decimals;
      } else {
        newBalances.cTEZ = 0;
      }
    }

    const aggregatedResults = [...balancesContracts, ...ledgerContracts];
    if (aggregatedResults) {
      aggregatedResults
        .filter(val => val.status === "fulfilled" && val.value)
        .forEach((val: PromiseFulfilledResult<any>) => {
          const token = tokens.find(tk => tk[0] === val.value.token);
          if (!val.value.active) {
            newBalances[token[0]] = 0;
          } else if (
            (token[1].type === "fa1.2" || token[1].type === "fa2") &&
            val.value.value
          ) {
            if (!isNaN(+val.value.value)) {
              newBalances[token[0]] =
                +val.value.value / 10 ** token[1].decimals;
            } else if (
              isNaN(+val.value.value) &&
              val.value.value.hasOwnProperty("balance")
            ) {
              newBalances[token[0]] =
                +val.value.value.balance / 10 ** token[1].decimals;
            } else {
              newBalances[token[0]] = 0;
            }
          } else {
            newBalances[token[0]] = 0;
          }
        });
    }

    return newBalances;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const calcTotalShareValueInTez = (
  tokensOwned: number,
  shareValueInTez: number,
  tokenToTezExchangeRate: number,
  tokenDecimals: number
): number => {
  const tezValue = shareValueInTez / 10 ** 6;
  const tokenValue =
    shareValueInTez /
    10 ** 6 /
    (tokenToTezExchangeRate / 10 ** tokenDecimals) /
    10 ** tokenDecimals;
  const tokenToTezValue = tokenValue * tokenToTezExchangeRate;

  return (tokensOwned / 10 ** tokenDecimals) * (tezValue + tokenToTezValue);
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
  const localStore = get(store);

  const tokenIds = getTokenIds(param);
  let icons: IconSet = [];
  const maybeInvestment = Object.values(localStore.investments).find(
    inv => inv.address === target.address
  );
  if (maybeInvestment) {
    icons = [...maybeInvestment.icons];
  } else {
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
        icons = ["QUIPUSWAP", AvailableToken.KUSD];
        break;
      case "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA":
        icons = ["QUIPUSWAP", AvailableToken.KUSD];
        break;
      case "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z":
        icons = ["QUIPUSWAP", AvailableToken.PLENTY];
        break;
      case "KT1WxgZ1ZSfMgmsSDDcUn8Xn577HwnQ7e1Lb":
        icons = ["QUIPUSWAP", AvailableToken.USDTZ];
        break;
      case "KT1Evsp2yA19Whm24khvFPcwimK6UaAJu8Zo":
        icons = ["QUIPUSWAP", AvailableToken.ETHTZ];
        break;
      case "KT1RRgK6eXvCWCiEGWhRZCSVGzhDzwXEEjS4":
        icons = ["QUIPUSWAP", AvailableToken.CRUNCH];
        break;
      case "KT1LRboPna9yQY9BrjtQYDS1DVxhKESK4VVd":
        icons = [AvailableToken.WRAP];
        break;
      case "KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ":
        icons = tokenIds
          ? tokenIds.map(tokenId => config.wrapTokenIds[tokenId].name)
          : [AvailableToken.WRAP];
        break;
      case "KT1KnuE87q1EKjPozJ5sRAjQA24FPsP57CE3":
        icons = ["crDAO"];
        break;
      case "KT1DMCGGiHT2dgjjXHG7qh1C1maFchrLNphx":
      case "KT1WfbRVLuJUEizo6FSTFq5tsi3rsUHLY7vg":
      case "KT1CjrJzk4S66uqv2M3DQHwBAzjD7MVm1jYs":
        icons = [AvailableToken.PAUL];
        break;
      default:
        if (
          target.alias &&
          Object.keys(localStore.tokens).includes(target.alias)
        ) {
          icons = [target.alias.trim() as IconValue];
        } else if (
          Object.values(localStore.tokens).filter(
            tk => tk.address === target.address
          ).length === 1
        ) {
          icons = [
            Object.entries(localStore.tokens).filter(
              tk => tk[1].address === target.address
            )[0][0] as IconValue
          ];
        } else {
          icons = ["user"];
        }
        break;
    }
  }

  return icons;
};

export const calculateValue = (op: any): number => {
  const localStore = get(store);
  const sender = op.sender;
  const target = op.target;
  const entrypoint = op.parameter ? op.parameter.entrypoint : null;

  const tokenAddresses = !localStore.tokens
    ? []
    : Object.values(localStore.tokens).map(tk => tk.address);
  const investmentAddresses = !localStore.investments
    ? []
    : Object.values(localStore.investments).map(tk => tk.address);

  if (tokenAddresses.includes(target.address)) {
    // THIS IS ONE OF THE AVAILABLE TOKENS
    const token = Object.values(localStore.tokens).find(
      tk => tk.address === target.address
    );
    if (entrypoint === "transfer") {
      // FA1.2 TOKEN TRANFER
      if (Array.isArray(op.parameter.value)) {
        return (
          +(
            +[
              0,
              0,
              ...op.parameter.value
                .map(transfer => transfer.txs)
                .flat(1)
                .map(tx => +tx.amount)
            ].reduce((a, b) => a + b) /
            10 ** token.decimals
          ).toFixed(5) / 1
        );
      } else if (
        op.parameter.value &&
        op.parameter.value.hasOwnProperty("value")
      ) {
        return (
          +(+op.parameter.value.value / 10 ** token.decimals).toFixed(5) / 1
        );
      } else {
        return 0;
      }
    } else if (entrypoint === "distribute") {
      // WRAP PROTOCOL
      let amount = 0;
      op.parameter.value.forEach(val => {
        if (val.to_ === localStore.userAddress) {
          amount += +val.amount;
        }
      });
      return amount / 10 ** token.decimals;
    } else if (
      entrypoint === "mint" &&
      [
        localStore.investments["PAUL-PAUL"].address,
        localStore.investments["PAUL-XTZ"].address
      ].includes(op.sender.address)
    ) {
      // PAUL farms
      let totalValue = 0;
      op.parameter.value.forEach(val => (totalValue += +val.nat));
      return totalValue / 10 ** token.decimals;
    } else {
      return 0;
    }
  } else if (investmentAddresses.includes(target.address)) {
    const contract = Object.values(localStore.investments).find(
      inv => inv.address === target.address
    );

    if (entrypoint === "stake" && contract.decimals) {
      if (target.address === "KT1JQAZqShNMakSNXc2cgTzdAWZFemGcU6n1") {
        return +(+op.parameter.value / 10 ** 6).toFixed(5) / 1;
      } else {
        return +(+op.parameter.value / 10 ** contract.decimals).toFixed(5) / 1;
      }
    } else if (
      entrypoint === "tokenToTezPayment" &&
      target.alias.split(" ")[0].toLowerCase() === "quipuswap"
    ) {
      const tokenSymbol = target.alias.split(" ")[1];
      if (Object.keys(AvailableToken).includes(tokenSymbol)) {
        return (
          +(
            +op.parameter.value.amount /
            10 ** localStore.tokens[tokenSymbol].decimals
          ).toFixed(5) / 1
        );
      }
    } else if (
      entrypoint === "deposit" &&
      target.address === localStore.investments["CRUNCHY-FARMS"].address
    ) {
      // CRUNCH DEPOSIT
      return (
        +(
          +op.parameter.value.nat_1 /
          10 ** localStore.tokens.CRUNCH.decimals
        ).toFixed(5) / 1
      );
    } else {
      return 0;
    }
  } else if (entrypoint === null && target.address.slice(0, 2) === "tz") {
    // IMPLICIT ACCOUNT
    return +(+op.amount / 10 ** 6).toFixed(5) / 1;
  } else {
    return 0;
  }

  //console.log(tokenSymbol, param);
  /*let tokenSymbol: AvailableToken;
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

  if (op.parameter && op.parameter.entrypoint === "transfer") {
    if (Array.isArray(op.param)) {
      return (
        +(
          +[
            0,
            0,
            ...op.param
              .map(transfer => transfer.txs)
              .flat(1)
              .map(tx => +tx.amount)
          ].reduce((a, b) => a + b) /
          10 ** decimals
        ).toFixed(5) / 1
      );
    } else if (op.param.hasOwnProperty("value")) {
      return +(+op.param.value / 10 ** decimals).toFixed(5) / 1;
    } else {
      return 0;
    }
  }*/
};

export const createNewOpEntry = (
  op: any,
  tokens: State["tokens"]
): Operation => {
  const localStore = get(store);

  const tokenIds = getTokenIds(op.param);
  const icons = getOpIcons(op.param, op.target);

  let alias = shortenHash(op.target.address);
  if (op.target.alias) {
    // if alias is provided by BCD
    alias = op.target.alias;
  } else {
    // check if alias is available in app
    const invInfo = localStore.investments
      ? Object.values(localStore.investments).find(
          inv => inv.address === op.target.address
        )
      : null;
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
    value: calculateValue(op),
    icons,
    raw: op,
    tokenIds,
    status: op.status
  };
};

export const getKolibriOvens = async (
  userAddress: TezosAccountAddress,
  Tezos: TezosToolkit
): Promise<KolibriOvenData[] | null> => {
  try {
    const response = await fetch(config.kolibriOvenOwnersUrl);
    if (response) {
      const data = await response.json();
      const { ovenData } = data;
      const ovens: any = await Promise.allSettled(
        ovenData
          .filter(d => d.ovenOwner === userAddress)
          .map(async d => {
            const contract = await Tezos.wallet.at(d.ovenAddress);
            const storage: any = await contract.storage();
            const balance = await Tezos.tz.getBalance(d.ovenAddress);

            return {
              address: d.ovenAddress,
              locked: balance.toNumber(),
              borrowed: storage.borrowedTokens.toNumber(),
              isLiquidated: storage.isLiquidated
            };
          })
      );

      return ovens
        .filter(res => res.status === "fulfilled")
        .map(res => res.value);
    }
  } catch (error) {
    console.log(error);
    return null;
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

export const fetchAddressFromTezosDomain = async (
  domain: string
): Promise<TezosContractAddress | null> => {
  const localStore = get(store);

  const contract = await localStore.Tezos.wallet.at(
    "KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS"
  );
  const storage: any = await contract.storage();
  const user = await storage.store.records.get(char2Bytes(domain));
  if (user) {
    return user.address;
  } else {
    return null;
  }
};

export const prepareOperation = (p: {
  contractCalls: ContractMethod<Wallet>[];
  amount: number;
  tokenSymbol: AvailableToken;
}): WalletOperationBatch => {
  const localStore = get(store);
  const { contractCalls, amount, tokenSymbol } = p;
  // calculates fee
  const amountToSendInXtz =
    +amount * +localStore.tokens[tokenSymbol].exchangeRate;
  let fee = 0;
  if (localStore.serviceFee !== null) {
    fee = (amountToSendInXtz * localStore.serviceFee) / 100;
  }
  // prepares batch operation
  let batch = localStore.Tezos.wallet.batch();
  contractCalls.forEach(call => batch.withContractCall(call));
  if (localStore.serviceFee === null) {
    return batch;
  } else {
    return batch.withTransfer({
      to: localStore.admin,
      amount: Math.ceil(fee * 10 ** 6),
      mutez: true
    });
  }
};

export const loadInvestment = async (
  investment: AvailableInvestments,
  userAddress: TezosAccountAddress
) => {
  const localStore = get(store);
  if (localStore.investments && localStore.investments[investment]) {
    const inv = localStore.investments[investment];
    if (inv.platform === "plenty") {
      try {
        const userDataResponse = await fetch(
          `https://api.tzkt.io/v1/contracts/${inv.address}/bigmaps/balances/keys/${userAddress}`
        );
        if (userDataResponse) {
          const userData = await userDataResponse.json();
          const balance = +userData.value.balance;
          const info = [];
          Object.values(userData.value.InvestMap).forEach(val =>
            info.push(val)
          );

          /*if (inv.id === "PLENTY-XTZ-LP") {
            console.error(
              "UPDATE loadInvestment FOR PLENTY-XTZ-LP IN utils.ts"
            );
            const dex = await findDex(
              localStore.Tezos,
              config.quipuswapFactories,
              {
                contract: localStore.tokens.PLENTY.address
              }
            );
            const dexStorage = await dex.contract.storage();
            const tezInShares = await estimateTezInShares(dexStorage, 1000000);

            return {
              id: inv.id,
              balance,
              info,
              shareValueInTez: tezInShares.toNumber()
            };
          }*/

          return { id: inv.id, balance, info };
        } else {
          return null;
        }
      } catch (error) {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    } else if (inv.platform === "quipuswap") {
      try {
        const userDataResponse = await fetch(
          `https://api.tzkt.io/v1/contracts/${inv.address}/bigmaps/ledger/keys/${userAddress}`
        );
        if (userDataResponse) {
          const userData = await userDataResponse.json();
          return {
            id: inv.id,
            balance: +userData.value.balance,
            info: undefined
          };
        } else {
          return {
            id: inv.id,
            balance: 0,
            info: undefined
          };
        }
      } catch (error) {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    } else if (inv.platform === "paul") {
      try {
        const userDataResponse = await fetch(
          `https://api.tzkt.io/v1/contracts/${inv.address}/bigmaps/account_info/keys/${userAddress}`
        );
        if (userDataResponse) {
          const userData = await userDataResponse.json();
          return {
            id: inv.id,
            balance: +userData.value.amount
          };
        } else {
          return {
            id: inv.id,
            balance: 0
          };
        }
      } catch (error) {
        return {
          id: inv.id,
          balance: 0
        };
      }
    } else if (inv.platform === "kdao") {
      try {
        const userDataResponse = await fetch(
          `https://api.tzkt.io/v1/contracts/${inv.address}/bigmaps/delegators/keys/${userAddress}`
        );
        if (userDataResponse) {
          const userData = await userDataResponse.json();
          return {
            id: inv.id,
            balance: +userData.value.lpTokenBalance,
            info: undefined
          };
        } else {
          return {
            id: inv.id,
            balance: 0,
            info: undefined
          };
        }
      } catch (error) {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    } else if (inv.platform === "wrap") {
      if (
        inv.id === AvailableInvestments["WRAP-STACKING"] ||
        inv.id.slice(-3) === "-LM"
      ) {
        // liquidity mining
        try {
          const userDataResponse = await fetch(
            `https://api.tzkt.io/v1/contracts/${inv.address}/bigmaps/delegators/keys/${userAddress}`
          );
          if (userDataResponse) {
            const userData = await userDataResponse.json();
            if (userData.value.hasOwnProperty("balance")) {
              return {
                id: inv.id,
                balance: +userData.value.balance,
                info: userData.stakes
              };
            } else if (userData.value.hasOwnProperty("lpTokenBalance")) {
              return {
                id: inv.id,
                balance: +userData.value.lpTokenBalance,
                info: undefined
              };
            } else {
              return {
                id: inv.id,
                balance: 0,
                info: undefined
              };
            }
          } else {
            return {
              id: inv.id,
              balance: 0,
              info: undefined
            };
          }
        } catch (error) {
          return {
            id: inv.id,
            balance: 0,
            info: undefined
          };
        }
      } else if (inv.id.slice(-3) === "-FM") {
        // fee mining
        try {
          const balanceResponse = await fetch(
            `https://api.tzkt.io/v1/contracts/${inv.address}/bigmaps/balances/keys/${userAddress}`
          );
          if (balanceResponse) {
            const balance = await balanceResponse.json();
            return {
              id: inv.id,
              balance: +balance.value,
              info: undefined
            };
          } else {
            return {
              id: inv.id,
              balance: 0,
              info: undefined
            };
          }
        } catch (error) {
          return {
            id: inv.id,
            balance: 0,
            info: undefined
          };
        }
      } else {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export const loadInvestments = async (
  investments: AvailableInvestments[],
  userAddress: TezosAccountAddress
) => {
  return Promise.allSettled(
    investments.map(inv => loadInvestment(inv, userAddress))
  );
};

/*export const loadInvestment = async (investment: AvailableInvestments) => {
  const localStore = get(store);
  if (localStore.investments && localStore.investments[investment]) {
    const inv = localStore.investments[investment];
    const contract = await localStore.Tezos.wallet.at(inv.address);
    const storage: any = await contract.storage();
    if (inv.platform === "plenty") {
      const userData = await storage.balances.get(localStore.userAddress);
      if (userData) {
        const balance = userData.balance.toNumber();
        const info = [];
        const entries = userData.InvestMap.entries();
        for (let entry of entries) {
          info.push({
            amount: entry[1].amount.toNumber(),
            level: entry[1].level.toNumber()
          });
        }

        if (inv.id === "PLENTY-XTZ-LP") {
          const dex = await findDex(
            localStore.Tezos,
            config.quipuswapFactories,
            {
              contract: localStore.tokens.PLENTY.address
            }
          );
          const dexStorage = await dex.contract.storage();
          const tezInShares = await estimateTezInShares(dexStorage, 1000000);

          return {
            id: inv.id,
            balance,
            info,
            shareValueInTez: tezInShares.toNumber()
          };
        }

        return { id: inv.id, balance, info };
      } else {
        return { id: inv.id, balance: 0, info: undefined };
      }
    } else if (inv.platform === "quipuswap") {
      const userData = await storage.storage.ledger.get(localStore.userAddress);
      if (userData) {
        return {
          id: inv.id,
          balance: userData.balance.toNumber(),
          info: undefined
        };
      } else {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    } else if (inv.platform === "paul") {
      const userData = await storage.account_info.get(localStore.userAddress);
      if (userData) {
        return {
          id: inv.id,
          balance: userData.amount.toNumber(),
          info: undefined
        };
      } else {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    } else if (inv.platform === "kdao") {
      const userData = await storage.delegators.get(localStore.userAddress);
      if (userData) {
        return {
          id: inv.id,
          balance: userData.lpTokenBalance.toNumber(),
          info: undefined
        };
      } else {
        return {
          id: inv.id,
          balance: 0,
          info: undefined
        };
      }
    }

    return null;
  } else {
    return null;
  }
};*/

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

export const getPaulReward = async (
  contractAddress: string,
  vaultMode?: boolean
): Promise<BigNumber | null> => {
  const localStore = get(store);
  const numberAccuracy = new BigNumber(1000000000000000000);

  const contract = await localStore.Tezos.wallet.at(contractAddress);
  const {
    last_updated: lastUpdated,
    share_reward: shareReward,
    total_staked: totalStaked,
    account_info: accountInfo,
    reward_per_second: rewardPerSecond,
    coefficient,
    referral_system: referralSystem
  } = await contract.storage();

  if (totalStaked.eq(0)) {
    return new BigNumber(0);
  }

  const referralSystemContract = await localStore.Tezos.wallet.at(
    referralSystem
  );
  const { commission } = await referralSystemContract.storage();

  const currentTime = new BigNumber(+new Date());
  const lastTime = new BigNumber(+new Date(lastUpdated));
  const time = currentTime.minus(lastTime).idiv(1000).abs();

  const newReward = time
    .times(rewardPerSecond.times(coefficient))
    .times(numberAccuracy);
  const newShareReward = new BigNumber(shareReward).plus(
    newReward.idiv(totalStaked).idiv(100)
  );

  const val = await accountInfo.get(localStore.userAddress);
  if (!val) return null;

  const reward = val.reward
    .plus(val.amount.times(newShareReward).minus(val.former))
    .idiv(numberAccuracy);

  // There is no commission for vaults
  if (vaultMode) {
    return reward;
  }

  const result = reward.times(new BigNumber(100).minus(commission)).idiv(100);

  if (result.toNumber() < 0) {
    return new BigNumber(0);
  } else {
    return result;
  }
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

export const lqtOutput = ({
  lqTokens,
  pool,
  lqtTotal,
  decimals
}: {
  lqTokens: number;
  pool: number;
  lqtTotal: number;
  decimals: number;
}): number => {
  return (+lqTokens * (pool / 10 ** decimals)) / lqtTotal;
};

export const calculateLqtOutput = ({
  lqTokens,
  xtzPool,
  lqtTotal,
  tezToTzbtc
}: {
  lqTokens: number;
  xtzPool: number;
  lqtTotal: number;
  tezToTzbtc: number;
}): { xtz: number; tzbtc: number } => {
  const xtzOut = lqtOutput({ lqTokens, pool: xtzPool, lqtTotal, decimals: 6 });

  return {
    xtz: xtzOut,
    tzbtc: +xtzOut * tezToTzbtc
  };
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
