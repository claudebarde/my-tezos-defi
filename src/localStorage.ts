import { writable } from "svelte/store";
import type { LocalStorageState } from "./types";
import { AvailableFiat } from "./types";

let state = null;
const localStorageItemName = "mtd";

if (globalThis?.window?.localStorage) {
  const localStorage = window.localStorage.getItem(localStorageItemName);
  let initialState: LocalStorageState;
  if (localStorage) {
    // gets the local storage
    initialState = JSON.parse(localStorage);
  } else {
    // sets up the local storage
    initialState = { preferredFiat: AvailableFiat.USD, lastAccess: Date.now() };
    window.localStorage.setItem(
      localStorageItemName,
      JSON.stringify(initialState)
    );
  }
  const store = writable(initialState);

  state = {
    subscribe: store.subscribe,
    updatePreferredFiat: (fiat: AvailableFiat) => {
      store.update(store => {
        const newStore = {
          ...store,
          preferredFiat: fiat,
          lastAccess: Date.now()
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
