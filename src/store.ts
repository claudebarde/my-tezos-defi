import { writable } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";
import type { State, TezosAccountAddress, TokenContract } from "./types";

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
    ETHtz: undefined
  },
  tokensExchangeRates: {
    kUSD: undefined,
    hDAO: undefined,
    PLENTY: undefined,
    wXTZ: undefined,
    STKR: undefined,
    tzBTC: undefined,
    USDtz: undefined,
    ETHtz: undefined
  },
  xtzFiatExchangeRate: undefined
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
  }
};

export default state;
