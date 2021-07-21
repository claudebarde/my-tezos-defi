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
    rpcUrl: "https://mainnet-tezos.giganode.io" // "https://api.tez.ie/rpc/mainnet"
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
  firstLoading: true,
  xtzData: {
    exchangeRate: undefined,
    balance: 0,
    historic: []
  },
  serviceFee: process.env.NODE_ENV === "development" ? null : 3,
  admin: "tz1TURQUcdTHQAGJNvv6TBHZ1YZEHLXXn5At",
  defiData: "QmbrajTfZUbynZk7EWrTo4scVBBFmzfxLj8vYv9FAJYyTy"
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
