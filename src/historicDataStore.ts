import { writable } from "svelte/store";
import type { AvailableToken } from "./types";

const initialState: {
  tokens: {
    [p in AvailableToken]: {
      timestamp: number;
      rate: { tokenToTez: number; tezToToken: number };
    }[];
  };
} = {
  tokens: {
    kUSD: [],
    hDAO: [],
    PLENTY: [],
    wXTZ: [],
    STKR: [],
    tzBTC: [],
    USDtz: [],
    ETHtz: [],
    CRUNCH: [],
    WRAP: [],
    wDAI: []
  }
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  updateToken: (
    tokenSymbol: AvailableToken,
    data: { tokenToTez: number; tezToToken: number }
  ) =>
    store.update(store => ({
      ...store,
      tokens: {
        ...store.tokens,
        [tokenSymbol]: [
          { timestamp: Date.now(), rate: data },
          ...store.tokens[tokenSymbol]
        ]
      }
    }))
};

export default state;
