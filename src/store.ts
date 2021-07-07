import { writable } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";
import type {
  State,
  TezosAccountAddress,
  TokenContract,
  Operation
} from "./types";
import { AvailableToken, AvailableInvestments } from "./types";

const settings: State["settings"] = {
  testnet: {
    rpcUrl: "https://api.tez.ie/rpc/florencenet",
    KUSD: "",
    WXTZ: "",
    STKR: "",
    USDTZ: "",
    ETHTZ: "",
    HDAO: "",
    PLENTY: ""
  },
  mainnet: {
    rpcUrl: "https://mainnet-tezos.giganode.io" //"https://api.tez.ie/rpc/mainnet"
  }
};

const initialState: State = {
  network: "mainnet",
  Tezos: undefined,
  wallet: undefined,
  userAddress: undefined,
  settings,
  tokens: {
    kUSD: {
      address: {
        mainnet: "KT1K9gCRgaLRFKTErYt1wVxA3Frb9FjasjTV",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
      decimals: 18,
      ledgerPath: "balances",
      ledgerKey: "address",
      type: "fa1.2",
      storage: undefined,
      color: "#3FBD93"
    },
    hDAO: {
      address: {
        mainnet: "KT1AFA2mwNUMNd4SsujE1YYp29vd8BZejyKW",
        testnet: "KT1z"
      },
      decimals: 6,
      dexContractAddress: "KT1QxLqukyfohPV5kPkw97Rs6cw1DDDvYgbB",
      ledgerPath: "ledger",
      ledgerKey: ["address", 0],
      type: "fa2",
      storage: undefined,
      color: "#020304",
      tokenId: 0
    },
    PLENTY: {
      address: {
        mainnet: "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z",
      decimals: 18,
      ledgerPath: "balances",
      ledgerKey: "address",
      type: "fa1.2",
      storage: undefined,
      color: "#5D0FAE"
    },
    wXTZ: {
      address: {
        mainnet: "KT1VYsVfmobT7rsMVivvZ4J8i3bPiqz12NaH",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1W3VGRUjvS869r4ror8kdaxqJAZUbPyjMT",
      decimals: 6,
      ledgerPath: "token/ledger",
      ledgerKey: "address",
      type: "fa1.2",
      storage: undefined,
      color: "#00BAE7"
    },
    STKR: {
      address: {
        mainnet: "KT1AEfeckNbdEYwaMKkytBwPJPycz7jdSGea",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1BMEEPX7MWzwwadW3NCSZe9XGmFJ7rs7Dr",
      decimals: 18,
      ledgerPath: "token/ledger",
      ledgerKey: "address",
      type: "fa1.2",
      storage: undefined,
      color: "#46C3E4"
    },
    tzBTC: {
      address: {
        mainnet: "KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1WBLrLE2vG8SedBqiSJFm4VVAZZBytJYHc",
      decimals: 8,
      ledgerPath: "0",
      ledgerKey: ["ledger", "address"],
      type: "fa1.2",
      storage: undefined,
      color: "#2B71E3"
    },
    USDtz: {
      address: {
        mainnet: "KT1LN4LPSqTMS7Sd2CJw4bbDGRkMv2t68Fy9",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1WxgZ1ZSfMgmsSDDcUn8Xn577HwnQ7e1Lb",
      decimals: 6,
      ledgerPath: "ledger",
      ledgerKey: "address",
      type: "fa1.2",
      storage: undefined,
      color: "#159DA2"
    },
    ETHtz: {
      address: {
        mainnet: "KT19at7rQUvyjxnZ2fBv7D9zc8rkyG7gAoU8",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1Evsp2yA19Whm24khvFPcwimK6UaAJu8Zo",
      decimals: 18,
      ledgerPath: "ledger",
      ledgerKey: "address",
      type: "fa1.2",
      storage: undefined,
      color: "#4E2CB6"
    },
    CRUNCH: {
      address: {
        mainnet: "KT1BHCumksALJQJ8q8to2EPigPW6qpyTr7Ng",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1RRgK6eXvCWCiEGWhRZCSVGzhDzwXEEjS4",
      decimals: 8,
      ledgerPath: "assets/ledger",
      ledgerKey: "address",
      type: "fa2",
      storage: undefined,
      color: "#FEDD00",
      tokenId: 0
    },
    WRAP: {
      address: {
        mainnet: "KT1LRboPna9yQY9BrjtQYDS1DVxhKESK4VVd",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1FG63hhFtMEEEtmBSX2vuFmP87t9E7Ab4t",
      decimals: 8,
      ledgerPath: "assets/ledger",
      ledgerKey: "address",
      type: "fa2",
      storage: undefined,
      color: "#FFCA00",
      tokenId: 0
    },
    wDAI: {
      address: {
        mainnet: "KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1PQ8TMzGMfViRq4tCMFKD2QF5zwJnY67Xn",
      decimals: 18,
      ledgerPath: "assets/ledger",
      ledgerKey: ["address", 5],
      type: "fa2",
      storage: undefined,
      color: "#F6CE13",
      tokenId: 5
    },
    wWBTC: {
      address: {
        mainnet: "KT18fp5rcTW7mbWDmzFwjLDUhs5MeJmagDSZ",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1DksKXvCBJN7Mw6frGj6y6F3CbABWZVpj1",
      decimals: 8,
      ledgerPath: "assets/ledger",
      ledgerKey: ["address", 19],
      type: "fa2",
      storage: undefined,
      color: "#F6CE13",
      tokenId: 19
    },
    sDAO: {
      address: {
        mainnet: "KT19ovJhcsUn4YU8Q5L3BGovKSixfbWcecEA",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1PrRTVNgxkRgyqqNQvwTiVhd55dqyxXJ6n",
      decimals: 0,
      ledgerPath: "assets/ledger",
      ledgerKey: ["address", 1],
      type: "fa2",
      storage: undefined,
      color: "#000000",
      tokenId: 1
    },
    crDAO: {
      address: {
        mainnet: "KT1XPFjZqCULSnqfKaaYy8hJjeY63UNSGwXg",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1FHiJmJUgZMPtv5F8M4ZEa6cb1D9Lf758T",
      decimals: 8,
      ledgerPath: "assets/ledger",
      ledgerKey: "address",
      type: "fa2",
      storage: undefined,
      color: "#8CFFFA",
      tokenId: 0
    },
    FLAME: {
      address: {
        mainnet: "KT1Wa8yqRBpFCusJWgcQyjhRz7hUQAmFxW7j",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1Q93ftAUzvfMGPwC78nX8eouL1VzmHPd4d",
      decimals: 6,
      ledgerPath: "ledger",
      ledgerKey: "address",
      type: "fa2",
      storage: undefined,
      color: "#FF9F00",
      tokenId: 0
    },
    KALAM: {
      address: {
        mainnet: "KT1A5P4ejnLix13jtadsfV9GCnXLMNnab8UT",
        testnet: "KT1z"
      },
      dexContractAddress: "KT1J3wTYb4xk5BsSBkg6ML55bX1xq7desS34",
      decimals: 10,
      ledgerPath: "ledger",
      ledgerKey: "address",
      type: "fa2",
      storage: undefined,
      color: "#00B7AC",
      tokenId: 0
    }
  },
  tokensBalances: {
    kUSD: undefined,
    hDAO: undefined,
    PLENTY: undefined,
    wXTZ: undefined,
    STKR: undefined,
    tzBTC: undefined,
    USDtz: undefined,
    ETHtz: undefined,
    CRUNCH: undefined,
    WRAP: undefined,
    wDAI: undefined,
    wWBTC: undefined,
    sDAO: undefined,
    crDAO: undefined,
    FLAME: undefined,
    KALAM: undefined
  },
  tokensExchangeRates: {
    kUSD: undefined,
    hDAO: undefined,
    PLENTY: undefined,
    wXTZ: undefined,
    STKR: undefined,
    tzBTC: undefined,
    USDtz: undefined,
    ETHtz: undefined,
    CRUNCH: undefined,
    WRAP: undefined,
    wDAI: undefined,
    wWBTC: undefined,
    sDAO: undefined,
    crDAO: undefined,
    FLAME: undefined,
    KALAM: undefined
  },
  investments: {
    "QUIPUSWAP-PLENTY": {
      id: AvailableInvestments["QUIPUSWAP-PLENTY"],
      platform: "quipuswap",
      address: {
        mainnet: "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap PLENTY",
      icons: ["QUIPU", AvailableToken.PLENTY],
      token: undefined
    },
    "QUIPUSWAP-KUSD": {
      id: AvailableInvestments["QUIPUSWAP-KUSD"],
      platform: "quipuswap",
      address: {
        mainnet: "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap kUSD",
      icons: ["QUIPU", AvailableToken.KUSD],
      token: undefined
    },
    "QUIPUSWAP-USDtz": {
      id: AvailableInvestments["QUIPUSWAP-USDtz"],
      platform: "quipuswap",
      address: {
        mainnet: "KT1WxgZ1ZSfMgmsSDDcUn8Xn577HwnQ7e1Lb",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap USDtz",
      icons: ["QUIPU", AvailableToken.USDTZ],
      token: undefined
    },
    "QUIPUSWAP-ETHtz": {
      id: AvailableInvestments["QUIPUSWAP-ETHtz"],
      platform: "quipuswap",
      address: {
        mainnet: "KT1Evsp2yA19Whm24khvFPcwimK6UaAJu8Zo",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap ETHtz",
      icons: ["QUIPU", AvailableToken.ETHTZ],
      token: undefined
    },
    "QUIPUSWAP-CRUNCH": {
      id: AvailableInvestments["QUIPUSWAP-CRUNCH"],
      platform: "quipuswap",
      address: {
        mainnet: "KT1RRgK6eXvCWCiEGWhRZCSVGzhDzwXEEjS4",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap CRUNCH",
      icons: ["QUIPU", AvailableToken.CRUNCH],
      token: undefined
    },
    "PLENTY-XTZ-LP": {
      id: AvailableInvestments["PLENTY-XTZ-LP"],
      platform: "plenty",
      address: {
        mainnet: "KT1JQAZqShNMakSNXc2cgTzdAWZFemGcU6n1",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "PLENTY-XTZ LP farm",
      icons: [AvailableToken.PLENTY, "XTZ"],
      token: AvailableToken.PLENTY
    },
    "PLENTY-hDAO": {
      id: AvailableInvestments["PLENTY-hDAO"],
      platform: "plenty",
      address: {
        mainnet: "KT1Ga15wxGR5oWK1vBG2GXbjYM6WqPgpfRSP",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty hDAO staking",
      icons: [AvailableToken.PLENTY, AvailableToken.HDAO],
      token: AvailableToken.HDAO
    },
    "PLENTY-PLENTY": {
      id: AvailableInvestments["PLENTY-PLENTY"],
      platform: "plenty",
      address: {
        mainnet: "KT1QqjR4Fj9YegB37PQEqXUPHmFbhz6VJtwE",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty staking",
      icons: [AvailableToken.PLENTY, AvailableToken.PLENTY],
      token: AvailableToken.PLENTY
    },
    "PLENTY-ETHtz": {
      id: AvailableInvestments["PLENTY-ETHtz"],
      platform: "plenty",
      address: {
        mainnet: "KT19asUVzBNidHgTHp8MP31YSphooMb3piWR",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty ETHtz staking",
      icons: [AvailableToken.PLENTY, AvailableToken.ETHTZ],
      token: AvailableToken.ETHTZ
    },
    "PLENTY-USDtz": {
      id: AvailableInvestments["PLENTY-USDtz"],
      platform: "plenty",
      address: {
        mainnet: "KT1MBqc3GHpApBXaBZyvY63LF6eoFyTWtySn",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty USDtz staking",
      icons: [AvailableToken.PLENTY, AvailableToken.USDTZ],
      token: AvailableToken.USDTZ
    },
    "PLENTY-KALAM": {
      id: AvailableInvestments["PLENTY-KALAM"],
      platform: "plenty",
      address: {
        mainnet: "KT1WfLprabHVTnNhWFigmopAduUpxG5HKvNf",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 10,
      info: [],
      alias: "Plenty Kalam staking",
      icons: [AvailableToken.PLENTY, AvailableToken.KALAM],
      token: AvailableToken.PLENTY
    },
    "CRUNCHY-FARMS": {
      id: AvailableInvestments["CRUNCHY-FARMS"],
      platform: "crunchy",
      address: {
        mainnet: "KT1KnuE87q1EKjPozJ5sRAjQA24FPsP57CE3",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 6,
      info: [],
      alias: "Crunchy.Network Farms V1",
      icons: ["crDAO"],
      token: AvailableToken.CRUNCH
    }
  },
  lastOperations: [],
  firstLoading: true,
  xtzData: {
    exchangeRate: undefined,
    balance: 0,
    historic: []
  },
  serviceFee: process.env.NODE_ENV === "development" ? null : 3,
  admin: "tz1TURQUcdTHQAGJNvv6TBHZ1YZEHLXXn5At"
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  updateTezos: (tezos: TezosToolkit) =>
    store.update(store => ({ ...store, Tezos: tezos })),
  updateWallet: (wallet: BeaconWallet) =>
    store.update(store => ({ ...store, wallet })),
  updateUserAddress: (address: TezosAccountAddress) => {
    store.update(store => ({
      ...store,
      userAddress: address
    }));
  },
  updateTezBalance: (balance: number) => {
    store.update(store => ({
      ...store,
      xtzData: { ...store.xtzData, balance }
    }));
  },
  updateTokens: (tokens: [string, TokenContract][]) => {
    store.update(store => {
      let newStore = { ...store };
      tokens.forEach(tk => {
        if (tk) {
          newStore.tokens[tk[0]] = tk[1];
        }
      });

      return newStore;
    });
  },
  updateTokensBalances: (newBalances: State["tokensBalances"]) => {
    store.update(store => {
      return {
        ...store,
        tokensBalances: newBalances
      };
    });
  },
  updateTokensExchangeRates: (
    newExchangeRates: State["tokensExchangeRates"]
  ) => {
    store.update(store => {
      if (
        !Object.values(store.tokensBalances).every(entry => entry === undefined)
      ) {
        let newTokens: any = {};
        const sortedBalances = Object.entries(store.tokensBalances).sort(
          (a, b) => {
            let balanceA = a[1];
            let balanceB = b[1];
            if (balanceA === undefined) {
              balanceA = 0;
            } else if (balanceB === undefined) {
              balanceB = 0;
            }

            return (
              balanceB *
                (newExchangeRates[b[0]]
                  ? newExchangeRates[b[0]].tokenToTez
                  : 0) -
              balanceA *
                (newExchangeRates[a[0]] ? newExchangeRates[a[0]].tokenToTez : 0)
            );
          }
        );
        sortedBalances.forEach(tk => (newTokens[tk[0]] = store.tokens[tk[0]]));
        return {
          ...store,
          tokens: newTokens,
          tokensExchangeRates: newExchangeRates
        };
      }

      return {
        ...store,
        tokensExchangeRates: newExchangeRates
      };
    });
  },
  updateXtzFiatExchangeRate: (newRate: number | undefined) => {
    store.update(store => ({
      ...store,
      xtzData: { ...store.xtzData, exchangeRate: newRate }
    }));
  },
  updateXtzDataHistoric: (
    newHistoric: { timestamp: number; rate: number }[]
  ) => {
    store.update(store => ({
      ...store,
      xtzData: { ...store.xtzData, historic: newHistoric }
    }));
  },
  updateLastOperations: (ops: Operation[]) => {
    store.update(store => ({
      ...store,
      lastOperations: [...ops.reverse(), ...store.lastOperations]
    }));
  },
  updateFirstLoading: (state: boolean) => {
    store.update(store => ({ ...store, firstLoading: state }));
  },
  updateInvestments: (newInvestments: State["investments"]) => {
    store.update(store => ({ ...store, investments: newInvestments }));
  },
  updateServiceFee: (newFee: State["serviceFee"]) =>
    store.update(store => ({ ...store, serviceFee: newFee }))
};

export default state;
