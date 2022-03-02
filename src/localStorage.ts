import { writable, get } from "svelte/store";
import type {
  LocalStorageState,
  TezosAccountAddress,
  TezosContractAddress
} from "./types";
import {
  AvailableFiat,
  AvailableToken,
  AvailableInvestments,
  InvestmentPlatform
} from "./types";
import generalStore from "./store";
import config from "./config";

let state = null;
const localStorageItemName = "mtd";
const version = config.version;
let favoriteRpcUrl = "https://mainnet.api.tez.ie";
let forceDownloadDefiData = false;
let initialState: LocalStorageState = {
  preferredFiat: AvailableFiat.USD,
  pushNotifications: false,
  favoriteTokens: [],
  favoriteInvestments: [],
  kUsdVaults: [],
  wXtzVaults: [],
  uUsdVaults: [],
  ctezVaults: [],
  lastUpdate: Date.now(),
  collapsedFarmViews: []
};

const wrapUserState = (
  state: LocalStorageState,
  userAddress: TezosAccountAddress,
  favoriteRpcUrl: string,
  forceDownloadDefiData: boolean
) => {
  if (!userAddress) throw "No user address";

  return {
    [userAddress]: state,
    version,
    favoriteRpcUrl,
    forceDownloadDefiData
  };
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
            if (stateFromStorage.hasOwnProperty("forceDownloadDefiData")) {
              forceDownloadDefiData = stateFromStorage.forceDownloadDefiData;
            }

            let newState;
            if (stateFromStorage.version !== version) {
              newState = { ...initialState, ...stateFromStorage[userAddress] };
              // updates the local storage
              try {
                window.localStorage.setItem(
                  localStorageItemName,
                  JSON.stringify(
                    wrapUserState(
                      newState,
                      userAddress,
                      favoriteRpcUrl,
                      forceDownloadDefiData
                    )
                  )
                );
              } catch (error) {
                console.error(error);
              }
            } else {
              // patches for typos in investment data
              if (
                stateFromStorage[userAddress] &&
                stateFromStorage[userAddress].hasOwnProperty(
                  "favoriteInvestments"
                ) &&
                stateFromStorage[userAddress].favoriteInvestments.includes(
                  "WRAP-WBTC-FM"
                )
              ) {
                const correctedFavoriteInvestments = stateFromStorage[
                  userAddress
                ].favoriteInvestments.filter(inv => inv !== "WRAP-WBTC-FM");
                correctedFavoriteInvestments.push("WRAP-WWBTC-FM");
                stateFromStorage[userAddress].favoriteInvestments =
                  correctedFavoriteInvestments;
              }
              if (
                stateFromStorage[userAddress] &&
                stateFromStorage[userAddress].hasOwnProperty(
                  "favoriteInvestments"
                ) &&
                stateFromStorage[userAddress].favoriteInvestments.includes(
                  "WRAP-USDC-FM"
                )
              ) {
                const correctedFavoriteInvestments = stateFromStorage[
                  userAddress
                ].favoriteInvestments.filter(inv => inv !== "WRAP-USDC-FM");
                correctedFavoriteInvestments.push("WRAP-WUSDC-FM");
                stateFromStorage[userAddress].favoriteInvestments =
                  correctedFavoriteInvestments;
              }
              newState = { ...stateFromStorage[userAddress] };
              // removes Ctez farms
              // TODO: remove after a few updates
              if (
                newState.favoriteInvestments.find(farm => farm.includes("Ctez"))
              ) {
                const newFavoriteInvestments =
                  newState.favoriteInvestments.filter(
                    farm => !farm.includes("Ctez")
                  );
                newState.favoriteInvestments = [...newFavoriteInvestments];
              }
            }

            return newState;
          } else {
            // sets up the local storage
            try {
              window.localStorage.setItem(
                localStorageItemName,
                JSON.stringify(
                  wrapUserState(
                    initialState,
                    userAddress,
                    favoriteRpcUrl,
                    forceDownloadDefiData
                  )
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    },
    addVault: (
      platform: "wxtz" | "kusd" | "uusd" | "ctez",
      vault: TezosContractAddress
    ) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        let vaultsToUpdate;
        switch (platform) {
          case "wxtz":
            vaultsToUpdate = "wXtzVaults";
            break;
          case "kusd":
            vaultsToUpdate = "kUsdVaults";
            break;
          case "uusd":
            vaultsToUpdate = "uUsdVaults";
            break;
          case "ctez":
            vaultsToUpdate = "ctezVaults";
            break;
        }

        const newStore = { ...store };
        if (!store.hasOwnProperty(vaultsToUpdate)) {
          newStore[vaultsToUpdate] = [vault];
        } else if (!store[vaultsToUpdate].includes(vault)) {
          newStore[vaultsToUpdate] = [...store[vaultsToUpdate], vault];
        }

        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    },
    removeVault: (
      platform: "wxtz" | "kusd" | "uusd" | "ctez",
      vault: TezosContractAddress
    ) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        let vaultsToUpdate;
        switch (platform) {
          case "wxtz":
            vaultsToUpdate = "wXtzVaults";
            break;
          case "kusd":
            vaultsToUpdate = "kUsdVaults";
            break;
          case "uusd":
            vaultsToUpdate = "uUSdVaults";
            break;
          case "ctez":
            vaultsToUpdate = "ctezVaults";
            break;
        }

        const newStore = {
          ...store,
          [vaultsToUpdate]: [...store[vaultsToUpdate].filter(v => v !== vault)]
        };
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  url,
                  forceDownloadDefiData
                )
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    },
    updateDownloadDefiData: (status: boolean) => {
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
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  status
                )
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    },
    updateCollapsedFarmViews: (farmViewPlatform: InvestmentPlatform) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        if (!store.hasOwnProperty("collapsedFarmViews")) {
          store.collapsedFarmViews = [];
        }

        const newStore = {
          ...store,
          collapsedFarmViews: store.collapsedFarmViews.includes(
            farmViewPlatform
          )
            ? store.collapsedFarmViews.filter(
                platform => platform !== farmViewPlatform
              )
            : [farmViewPlatform, ...store.collapsedFarmViews]
        };
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
              )
            );
          } catch (error) {
            console.error(error);
          }
        }
        return newStore;
      });
    },
    updateForceDownloadDefiData: (status: boolean) => {
      store.update(store => {
        const gnrlStore = get(generalStore);
        const newStore = {
          ...store,
          forceDownloadDefiData: status
        };
        if (gnrlStore.userAddress) {
          try {
            window.localStorage.setItem(
              localStorageItemName,
              JSON.stringify(
                wrapUserState(
                  newStore,
                  gnrlStore.userAddress,
                  favoriteRpcUrl,
                  forceDownloadDefiData
                )
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
