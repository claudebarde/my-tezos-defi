import { writable, get } from "svelte/store";
import type {
  LocalStorageState,
  TezosAccountAddress,
  TezosContractAddress
} from "./types";
import { AvailableFiat, AvailableToken, AvailableInvestments } from "./types";
import generalStore from "./store";
import config from "./config";

let state = null;
const localStorageItemName = "mtd";
const version = config.version;
let favoriteRpcUrl = "https://mainnet-tezos.giganode.io";
let initialState: LocalStorageState = {
  preferredFiat: AvailableFiat.USD,
  pushNotifications: false,
  favoriteTokens: [],
  favoriteInvestments: [],
  wXtzVaults: [],
  lastUpdate: Date.now()
};

const wrapUserState = (
  state: LocalStorageState,
  userAddress: TezosAccountAddress,
  favoriteRpcUrl: string
) => {
  if (!userAddress) throw "No user address";

  return { [userAddress]: state, version, favoriteRpcUrl };
};

if (globalThis?.window?.localStorage) {
  const store = writable(undefined);

  state = {
    subscribe: store.subscribe,
    init: (userAddress: TezosAccountAddress) => {
      store.update(_ => {
        if (!userAddress) {
          return initialState;
        } else {
          const localStorage =
            window.localStorage.getItem(localStorageItemName);
          if (localStorage) {
            // gets the local storage
            const stateFromStorage = JSON.parse(localStorage);
            // saves favorite RPC URL
            if (stateFromStorage.hasOwnProperty("favoriteRpcUrl")) {
              favoriteRpcUrl = stateFromStorage.favoriteRpcUrl;
            }
            let newState;
            if (stateFromStorage.version !== version) {
              newState = { ...initialState, ...stateFromStorage[userAddress] };
              if (newState.hasOwnProperty("favoriteRpcUrl")) {
                // THIS CAN BE REMOVED AFTER A FEW UPDATES
                delete newState.favoriteRpcUrl;
              }
              // updates the local storage
              try {
                window.localStorage.setItem(
                  localStorageItemName,
                  JSON.stringify(
                    wrapUserState(newState, userAddress, favoriteRpcUrl)
                  )
                );
              } catch (error) {
                console.error(error);
              }
            } else {
              newState = { ...stateFromStorage[userAddress] };
            }

            return newState;
          } else {
            // sets up the local storage
            try {
              window.localStorage.setItem(
                localStorageItemName,
                JSON.stringify(
                  wrapUserState(initialState, userAddress, favoriteRpcUrl)
                )
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
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
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, favoriteRpcUrl)
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    },
    updateFavoriteRpcUrl: (url: string) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          lastUpdate: Date.now()
        };
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(newStore, gnrlStore.userAddress, url)
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    }
  };
}

export default state;
