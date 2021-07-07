import { writable } from "svelte/store";
import type { LocalStorageState } from "./types";
import { AvailableFiat, AvailableToken, ExchangeRateData } from "./types";

let state = null;
const localStorageItemName = "mtd";
let initialState: LocalStorageState = {
  preferredFiat: AvailableFiat.USD,
  pushNotifications: false,
  tokenExchangeRates: [],
  xtzExchangeRate: 0,
  tokenBalances: [],
  lastUpdate: Date.now(),
  version: "2.7.0"
};

if (globalThis?.window?.localStorage) {
  const localStorage = window.localStorage.getItem(localStorageItemName);
  if (localStorage) {
    // gets the local storage
    const stateFromStorage = JSON.parse(localStorage);
    if (stateFromStorage.version !== initialState.version) {
      initialState = { ...initialState, ...stateFromStorage };
      // updates the local storage
      window.localStorage.setItem(
        localStorageItemName,
        JSON.stringify(initialState)
      );
    } else {
      initialState = { ...stateFromStorage };
    }
  } else {
    // sets up the local storage
    window.localStorage.setItem(
      localStorageItemName,
      JSON.stringify(initialState)
    );
  }
  const store = writable(initialState);

  state = {
    subscribe: store.subscribe,
    updateFiat: (fiat: AvailableFiat, exchangeRate: number) => {
      store.update(store => {
        const newStore = {
          ...store,
          preferredFiat: fiat,
          xtzExchangeRate: exchangeRate,
          lastUpdate: Date.now()
        };
        window.localStorage.setItem(
          localStorageItemName,
          JSON.stringify(newStore)
        );
        return newStore;
      });
    },
    updateTokenExchangeRates: (data: [AvailableToken, ExchangeRateData][]) => {
      store.update(store => {
        const newStore = {
          ...store,
          tokenExchangeRates: data,
          lastUpdate: Date.now()
        };
        window.localStorage.setItem(
          localStorageItemName,
          JSON.stringify(newStore)
        );
        return newStore;
      });
    },
    updateTokenBalances: (data: [AvailableToken, number][]) => {
      store.update(store => {
        const newStore = {
          ...store,
          tokenBalances: data,
          lastUpdate: Date.now()
        };
        window.localStorage.setItem(
          localStorageItemName,
          JSON.stringify(newStore)
        );
        return newStore;
      });
    }
  };
}

export default state;
