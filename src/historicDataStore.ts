import { writable } from "svelte/store";
import type { AvailableToken, HistoricalDataState } from "./types";

const initialState: HistoricalDataState = {
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
    wDAI: [],
    sDAO: [],
    crDAO: [],
    FLAME: [],
    KALAM: []
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
