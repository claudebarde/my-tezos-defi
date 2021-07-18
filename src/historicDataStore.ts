import { writable } from "svelte/store";
import type { AvailableToken, HistoricalDataState } from "./types";

const initialState: HistoricalDataState = {
  tokens: undefined
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  initTokens: (tokensList: AvailableToken[]) =>
    store.update(store => {
      let tokens: any = {};
      tokensList.forEach(token => (tokens[token] = []));
      return { ...store, tokens };
    }),
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
