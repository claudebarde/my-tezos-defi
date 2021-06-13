import { writable } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";
import type {
  State,
  TezosAccountAddress,
  TokenContract,
  Operation
} from "./types";
import { AvailableToken } from "./types";

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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
      storage: undefined
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
    wDAI: undefined
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
    wDAI: undefined
  },
  investments: {
    "QUIPUSWAP-PLENTY": {
      address: {
        mainnet: "KT1X1LgNkQShpF9nRLYw3Dgdy4qp38MX617z",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap PLENTY",
      icons: ["QUIPU", AvailableToken.PLENTY]
    },
    "QUIPUSWAP-KUSD": {
      address: {
        mainnet: "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap kUSD",
      icons: ["QUIPU", AvailableToken.KUSD]
    },
    "QUIPUSWAP-USDtz": {
      address: {
        mainnet: "KT1WxgZ1ZSfMgmsSDDcUn8Xn577HwnQ7e1Lb",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap USDtz",
      icons: ["QUIPU", AvailableToken.USDTZ]
    },
    "QUIPUSWAP-ETHtz": {
      address: {
        mainnet: "KT1Evsp2yA19Whm24khvFPcwimK6UaAJu8Zo",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 0,
      info: [],
      alias: "QuipuSwap ETHtz",
      icons: ["QUIPU", AvailableToken.ETHTZ]
    },
    "PLENTY-XTZ-LP": {
      address: {
        mainnet: "KT1JQAZqShNMakSNXc2cgTzdAWZFemGcU6n1",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "PLENTY-XTZ LP farm",
      icons: [AvailableToken.PLENTY, "XTZ"]
    },
    "PLENTY-hDAO": {
      address: {
        mainnet: "KT1Ga15wxGR5oWK1vBG2GXbjYM6WqPgpfRSP",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty hDAO staking",
      icons: [AvailableToken.PLENTY, AvailableToken.HDAO]
    },
    "PLENTY-PLENTY": {
      address: {
        mainnet: "KT1QqjR4Fj9YegB37PQEqXUPHmFbhz6VJtwE",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty staking",
      icons: [AvailableToken.PLENTY, AvailableToken.PLENTY]
    },
    "PLENTY-ETHtz": {
      address: {
        mainnet: "KT19asUVzBNidHgTHp8MP31YSphooMb3piWR",
        testnet: "KT1z"
      },
      balance: undefined,
      decimals: 18,
      info: [],
      alias: "Plenty ETHtz staking",
      icons: [AvailableToken.PLENTY, AvailableToken.ETHTZ]
    }
  },
  xtzFiatExchangeRate: undefined,
  lastOperations: [],
  firstLoading: true
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  updateTezos: (tezos: TezosToolkit) =>
    store.update(store => ({ ...store, Tezos: tezos })),
  updateWallet: (wallet: BeaconWallet) =>
    store.update(store => ({ ...store, wallet })),
  updateUserAddress: (address: TezosAccountAddress) => {
    store.update(store => ({ ...store, userAddress: address }));
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
    store.update(store => ({
      ...store,
      tokensBalances: newBalances
    }));
  },
  updateTokensExchangeRates: (
    newExchangeRates: State["tokensExchangeRates"]
  ) => {
    store.update(store => ({
      ...store,
      tokensExchangeRates: newExchangeRates
    }));
  },
  updateXtzFiatExchangeRate: (newRate: number | undefined) => {
    store.update(store => ({ ...store, xtzFiatExchangeRate: newRate }));
  },
  updateLastOperations: (ops: Operation[]) => {
    store.update(store => {
      const currentLevel = ops[0].level;
      // removes operations from more than 4 levels behind
      const previousLastOps = [
        ...store.lastOperations.filter(op => op.level >= currentLevel - 4)
      ];

      return {
        ...store,
        lastOperations: [...ops.reverse(), ...previousLastOps]
      };
    });
  },
  updateFirstLoading: (state: boolean) => {
    store.update(store => ({ ...store, firstLoading: state }));
  },
  updateInvestments: (newInvestments: State["investments"]) => {
    store.update(store => ({ ...store, investments: newInvestments }));
  }
};

export default state;
