import { writable } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";
import type {
  State,
  TezosAccountAddress,
  UserToken,
  AvailableToken,
  InvestmentData
} from "./types";
import type Token from "./Token";
import { AvailableInvestment } from "./types";
import config from "./config";
import type { LocalStorage } from "./localStorage";

const initialState: State = {
  isAppReady: false,
  settings: {
    rpcUrl: config.rpcUrl,
    defiData: "Qmf4Kt4qHfsxbu6Ne8rVtFW2TmYCsNgqgFShjP86LaMQXm"
  },
  Tezos: undefined,
  wallet: undefined,
  userAddress: undefined,
  userName: undefined,
  userBalance: undefined,
  xtzExchangeRate: undefined,
  xtzPriceHistoric: [],
  userTokens: undefined,
  tokens: undefined,
  investments: undefined,
  currentLevel: 0,
  serviceFee: process.env.NODE_ENV === "development" ? null : 0.003,
  admin: "tz1TURQUcdTHQAGJNvv6TBHZ1YZEHLXXn5At",
  localStorage: undefined
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  updateAppReady: () => store.update(store => ({ ...store, isAppReady: true })),
  updateTezos: (tezos: TezosToolkit) =>
    store.update(store => ({ ...store, Tezos: tezos })),
  updateWallet: (wallet: BeaconWallet | undefined) =>
    store.update(store => ({ ...store, wallet })),
  updateUserAddress: (address: TezosAccountAddress | undefined) => {
    store.update(store => ({
      ...store,
      userAddress: address
    }));
  },
  updateUserName: (name: string | undefined) => {
    store.update(store => ({
      ...store,
      userName: name
    }));
  },
  updateUserBalance: (balance: number | undefined) => {
    store.update(store => ({
      ...store,
      userBalance: balance
    }));
  },
  updateXtzExchangeRate: (exchangeRate: number) =>
    store.update(store => ({ ...store, xtzExchangeRate: exchangeRate })),
  updatePriceHistoric: (historic: State["xtzPriceHistoric"]) =>
    store.update(store => ({ ...store, xtzPriceHistoric: historic })),
  updateUserTokens: (tokens: Array<UserToken>) =>
    store.update(store => ({ ...store, userTokens: tokens })),
  updateTokens: (newTokens: Array<[AvailableToken, Token]>) =>
    store.update(store => {
      let tokens;
      if (!store.tokens) {
        tokens = {};
      } else {
        tokens = store.tokens;
      }

      newTokens.forEach(
        ([tokenName, tokenData]) => (tokens[tokenName] = tokenData)
      );

      return { ...store, tokens };
    }),
  updateInvestments: (
    newInvestments: Array<[AvailableInvestment, InvestmentData]>
  ) =>
    store.update(store => {
      let investments;
      if (!store.investments) {
        investments = {};
      } else {
        investments = store.investments;
      }

      newInvestments.forEach(([invName, invData]) => {
        if (Object.values(AvailableInvestment).includes(invName) && invData) {
          investments[invName] = invData;
        }
      });
      return { ...store, investments };
    }),
  updateCurrentLevel: (level: number) =>
    store.update(store => ({ ...store, currentLevel: level })),
  updateLocalStorage: (localStorage: LocalStorage) =>
    store.update(store => ({ ...store, localStorage }))
};

export default state;
