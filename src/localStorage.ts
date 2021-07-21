import { writable } from "svelte/store";
import type { LocalStorageState } from "./types";
import { AvailableFiat, AvailableToken, AvailableInvestments } from "./types";

let state = null;
const localStorageItemName = "mtd";
let initialState: LocalStorageState = {
  preferredFiat: AvailableFiat.USD,
  pushNotifications: false,
  favoriteTokens: [],
  favoriteInvestments: [],
  lastUpdate: Date.now(),
  version: "3.0.0"
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
    addFavoriteToken: (tokenSymbol: AvailableToken) => {
      store.update(store => {
        const newStore = {
          ...store,
          favoriteTokens: !store.favoriteTokens.includes(tokenSymbol)
            ? [...store.favoriteTokens, tokenSymbol]
            : store.favoriteTokens
        };
        window.localStorage.setItem(
          localStorageItemName,
          JSON.stringify(newStore)
        );
        return newStore;
      });
    },
    removeFavoriteToken: (tokenSymbol: AvailableToken) => {
      store.update(store => {
        const newStore = {
          ...store,
          favoriteTokens: [
            ...store.favoriteTokens.filter(tk => tk !== tokenSymbol)
          ]
        };
        window.localStorage.setItem(
          localStorageItemName,
          JSON.stringify(newStore)
        );
        return newStore;
      });
    },
    addFavoriteInvestment: (investment: AvailableInvestments) => {
      store.update(store => {
        const newStore = {
          ...store,
          favoriteInvestments: !store.favoriteInvestments.includes(investment)
            ? [...store.favoriteInvestments, investment]
            : store.favoriteInvestments
        };
        window.localStorage.setItem(
          localStorageItemName,
          JSON.stringify(newStore)
        );
        return newStore;
      });
    },
    removeFavoriteInvestment: (investment: AvailableInvestments) => {
      store.update(store => {
        const newStore = {
          ...store,
          favoriteInvestments: [
            ...store.favoriteInvestments.filter(inv => inv !== investment)
          ]
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
