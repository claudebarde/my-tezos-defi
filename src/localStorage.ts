import config from "./config";
import type { AvailableInvestment, TezosAccountAddress } from "./types";
import { AvailableFiat } from "./types";

export interface FiatData {
  code: AvailableFiat;
  symbol: string;
  name: string;
}
export interface userStorage {
  version: string;
  farms: Array<AvailableInvestment>;
  lastActiveLevel: number;
  showLiquidatedVaults: boolean;
  favoriteFiat: FiatData;
}
export interface localStorage {
  [p: TezosAccountAddress]: userStorage;
  rpcUrl: string;
}

const defaultRpcUrl = "https://mainnet.api.tez.ie";

export class LocalStorage {
  static #storageName = "mtd-storage";
  private currentUser: TezosAccountAddress;
  private version: string;
  private farms: Array<AvailableInvestment>;
  private lastActiveLevel: number;
  private allowPushNotifications: boolean;
  public showLiquidatedVaults: boolean;
  public rpcUrl: string;
  private favoriteFiat: FiatData;

  constructor(userAddress: TezosAccountAddress, currentLevel: number) {
    if (window && window.localStorage) {
      this.currentUser = userAddress;
      this.rpcUrl = LocalStorage.getRpcUrl();

      const localStorage = this.getStorage();
      if (localStorage) {
        this.version = localStorage.version;
        this.farms = localStorage.farms || [];
        this.lastActiveLevel = currentLevel;
        this.favoriteFiat = localStorage.favoriteFiat
          ? localStorage.favoriteFiat
          : config.validFiats.find(fiat => fiat.code === AvailableFiat.USD);
        // updates the storage to add lastActiveLevel property
        if (
          !localStorage.hasOwnProperty("lastActiveLevel") ||
          !localStorage.hasOwnProperty("showLiquidatedVaults")
        ) {
          this.showLiquidatedVaults = true;
          this.saveStorage({
            version: localStorage.version,
            farms: localStorage.farms,
            lastActiveLevel: currentLevel,
            showLiquidatedVaults: true,
            favoriteFiat: this.favoriteFiat
          });
        } else {
          this.showLiquidatedVaults = localStorage.showLiquidatedVaults;
        }
      } else {
        // new user
        const newStorage: userStorage = {
          version: config.version,
          farms: [],
          lastActiveLevel: currentLevel,
          showLiquidatedVaults: true,
          favoriteFiat: config.validFiats.find(
            fiat => fiat.code === AvailableFiat.USD
          )
        };
        this.saveStorage(newStorage);
      }
    } else {
      console.error("local storage is not available");
    }
  }

  private getStorage(): userStorage | null {
    const localStorage = window.localStorage.getItem(LocalStorage.#storageName);
    if (localStorage) {
      const storage = JSON.parse(localStorage);
      this.rpcUrl;
      if (storage.hasOwnProperty(this.currentUser)) {
        return storage[this.currentUser];
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  private saveStorage(val: Partial<userStorage>) {
    // window.localStorage.setItem(
    //   LocalStorage.#storageName,
    //   JSON.stringify({ [this.currentUser]: val, rpcUrl: this.rpcUrl })
    // );
    window.localStorage.setItem(
      LocalStorage.#storageName,
      JSON.stringify({
        [this.currentUser]: {
          version: this.version,
          farms: this.farms,
          lastActiveLevel: this.lastActiveLevel,
          showLiquidatedVaults: this.showLiquidatedVaults,
          favoriteFiat: this.favoriteFiat,
          ...val
        },
        rpcUrl: this.rpcUrl
      })
    );
  }

  public getVersion() {
    return this.version;
  }

  public getFarms() {
    return this.farms;
  }

  public getLastActiveLevel() {
    return this.lastActiveLevel;
  }

  public getFavoriteFiat() {
    return this.favoriteFiat;
  }

  public addFarms(farms: Array<AvailableInvestment>) {
    const newFarms = Array.from(new Set([...this.farms, ...farms]));
    this.farms = newFarms;
    this.saveStorage({
      farms: newFarms
    });
  }

  public removeFarms(farms: Array<AvailableInvestment>) {
    const newFarms = this.farms.filter(farm => !farms.includes(farm));
    this.farms = newFarms;
    this.saveStorage({
      farms: newFarms
    });
  }

  public updateLastActiveLevel(level: number) {
    this.lastActiveLevel = level;
    this.saveStorage({
      lastActiveLevel: level
    });
  }

  public updateLiquidatedVaultsDisplay(show: boolean) {
    this.showLiquidatedVaults = show;
    this.saveStorage({
      showLiquidatedVaults: show
    });
  }

  static getRpcUrl(): string {
    const localStorage = window.localStorage.getItem(LocalStorage.#storageName);
    if (localStorage) {
      const storage = JSON.parse(localStorage);
      if (storage.hasOwnProperty("rpcUrl")) {
        return storage.rpcUrl;
      }
    }

    return defaultRpcUrl;
  }

  public setRpcUrl(rpcUrl: string): boolean {
    const localStorage = window.localStorage.getItem(LocalStorage.#storageName);
    if (localStorage) {
      this.rpcUrl = rpcUrl;
      const newLocalStorage = { ...JSON.parse(localStorage), rpcUrl };
      window.localStorage.setItem(
        LocalStorage.#storageName,
        JSON.stringify(newLocalStorage)
      );
      return true;
    } else {
      return false;
    }
  }

  public setFavoriteFiat(fiat: FiatData): void {
    this.favoriteFiat = fiat;
    this.saveStorage({
      favoriteFiat: fiat
    });
  }
}
