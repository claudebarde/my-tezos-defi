import { writable } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";
import type {
  State,
  TezosAccountAddress,
  TokenContract,
  Operation,
  AvailableToken
} from "./types";
import { sortTokensByBalance } from "./utils";

const settings: State["settings"] = {
  testnet: {
    validRpcUrls: [],
    rpcUrl: "https://api.tez.ie/rpc/florencenet"
  },
  mainnet: {
    validRpcUrls: [
      { name: "Tezos Giganode", url: "https://mainnet-tezos.giganode.io" },
      { name: "ECAD Labs", url: "https://api.tez.ie/rpc/mainnet" },
      { name: "SmartPy", url: "https://mainnet.smartpy.io/" },
      { name: "Blockscale", url: "https://rpc.tzbeta.net/" },
      { name: "LetzBake!", url: "https://teznode.letzbake.com/" }
    ],
    rpcUrl: "https://api.tez.ie/rpc/mainnet" // "https://mainnet-tezos.giganode.io"
  }
};

const initialState: State = {
  network: "mainnet",
  Tezos: undefined,
  wallet: undefined,
  userAddress: undefined,
  settings,
  tokens: undefined,
  tokensBalances: undefined,
  tokensExchangeRates: undefined,
  investments: undefined,
  lastOperations: [],
  xtzData: {
    exchangeRate: undefined,
    balance: 0,
    historic: []
  },
  serviceFee: process.env.NODE_ENV === "development" ? null : 3,
  admin: "tz1TURQUcdTHQAGJNvv6TBHZ1YZEHLXXn5At",
  defiData: "Qmc3Furj5s62uzeCKHH3KXfWqgYETsyoe7PxXwf4ohY4DP",
  liquidityBaking: undefined,
  blurryBalances: false
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
      let newTokens: any = {};
      tokens.forEach(tk => {
        if (tk) {
          newTokens[tk[0]] = tk[1];
        }
      });

      return { ...store, tokens: newTokens };
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
        store.tokensBalances &&
        !Object.values(store.tokensBalances).every(entry => entry === undefined)
      ) {
        let newTokens = { ...store.tokens };
        const sortedBalances = sortTokensByBalance(
          Object.entries(store.tokensBalances) as [AvailableToken, number][]
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
  updateInvestments: (newInvestments: State["investments"]) => {
    store.update(store => ({ ...store, investments: newInvestments }));
  },
  updateServiceFee: (newFee: State["serviceFee"]) =>
    store.update(store => ({ ...store, serviceFee: newFee })),
  updateLiquitidyBaking: (data: State["liquidityBaking"]) =>
    store.update(store => ({ ...store, liquidityBaking: data })),
  updateBlurryBalances: (blur: boolean) =>
    store.update(store => ({ ...store, blurryBalances: blur }))
};

export default state;
