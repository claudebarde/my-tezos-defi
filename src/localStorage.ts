import { writable, get } from "svelte/store";
import type {
  LocalStorageState,
  TezosAccountAddress,
  TezosContractAddress
} from "./types";
import { AvailableFiat, AvailableToken, AvailableInvestments } from "./types";
import generalStore from "./store";

let state = null;
const localStorageItemName = "mtd";
const version = "3.3.0";
let initialState: LocalStorageState = {
  preferredFiat: AvailableFiat.USD,
  pushNotifications: false,
  favoriteTokens: [],
  favoriteInvestments: [],
  favoriteRpcUrl: "https://mainnet-tezos.giganode.io",
  wXtzVaults: [],
  lastUpdate: Date.now()
};

const wrapUserState = (
  state: LocalStorageState,
  userAddress: TezosAccountAddress
) => {
  if (!userAddress) throw "No user address";

  return { [userAddress]: state, version };
};

if (globalThis?.window?.localStorage) {
  const store = writable(undefined);

  state = {
    subscribe: store.subscribe,
    init: (userAddress: TezosAccountAddress) => {
      console.log("init local storage:", userAddress);
      store.update(_ => {
        if (!userAddress) {
          return initialState;
        } else {
          const localStorage =
            window.localStorage.getItem(localStorageItemName);
          if (localStorage) {
            // gets the local storage
            const stateFromStorage = JSON.parse(localStorage);
            /*let newState;
            if (stateFromStorage.version !== version) {
              newState = { ...initialState, ...stateFromStorage[userAddress] };
              console.log(newState);
              // updates the local storage
              try {
                window.localStorage.setItem(
                  localStorageItemName,
                  JSON.stringify(wrapUserState(newState, userAddress))
                );
              } catch (error) {
                console.error(error);
              }
            } else {
              newState = { ...stateFromStorage[userAddress] };
            }*/

            console.log(stateFromStorage);

            if (stateFromStorage.hasOwnProperty(userAddress)) {
              return stateFromStorage[userAddress];
            } else {
              return initialState;
            }
          } else {
            // sets up the local storage
            try {
              window.localStorage.setItem(
                localStorageItemName,
                JSON.stringify(wrapUserState(initialState, userAddress))
              );
            } catch (error) {
              console.error(error);
            }

            return initialState;
          }
        }
      });
    },
    destroy: () => {
      store.update(_ => initialState);
    },
    updateFiat: (fiat: AvailableFiat, exchangeRate: number) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          preferredFiat: fiat,
          xtzExchangeRate: exchangeRate,
          lastUpdate: Date.now()
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    addFavoriteToken: (tokenSymbol: AvailableToken) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          favoriteTokens: !store.favoriteTokens.includes(tokenSymbol)
            ? [...store.favoriteTokens, tokenSymbol]
            : store.favoriteTokens
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    removeFavoriteToken: (tokenSymbol: AvailableToken) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          favoriteTokens: [
            ...store.favoriteTokens.filter(tk => tk !== tokenSymbol)
          ]
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    addFavoriteInvestment: (investment: AvailableInvestments) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          favoriteInvestments: !store.favoriteInvestments.includes(investment)
            ? [...store.favoriteInvestments, investment]
            : store.favoriteInvestments
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    removeFavoriteInvestment: (investment: AvailableInvestments) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          favoriteInvestments: [
            ...store.favoriteInvestments.filter(inv => inv !== investment)
          ]
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    addWxtzVault: (vault: TezosContractAddress) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          wXtzVaults: !store.wXtzVaults.includes(vault)
            ? [...store.wXtzVaults, vault]
            : store.wXtzVaults
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    removeWxtzVault: (vault: TezosContractAddress) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          wXtzVaults: [...store.wXtzVaults.filter(v => v !== vault)]
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    },
    updateFavoriteRpcUrl: (url: string) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          favoriteRpcUrl: url,
          lastUpdate: Date.now()
        };
        try {
          window.localStorage.setItem(
            localStorageItemName,
            JSON.stringify(wrapUserState(newStore, gnrlStore.userAddress))
          );
        } catch (error) {
          console.error(error);
        }
        return newStore;
      });
    }
  };
}

export default state;
