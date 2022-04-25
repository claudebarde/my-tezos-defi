import config from "./config";
import type { AvailableInvestment, TezosAccountAddress } from "./types";

export interface userStorage {
  version: string;
  farms: Array<AvailableInvestment>;
  lastActiveLevel: number;
  showLiquidatedVaults: boolean;
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
  public showLiquidatedVaults: boolean;
  public rpcUrl: string;

  constructor(userAddress: TezosAccountAddress, currentLevel: number) {
    if (window && window.localStorage) {
      this.currentUser = userAddress;
      this.rpcUrl = LocalStorage.getRpcUrl();

      const localStorage = this.getStorage();
      if (localStorage) {
        this.version = localStorage.version;
        this.farms = localStorage.farms;
        this.lastActiveLevel = currentLevel;
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
            showLiquidatedVaults: true
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
          showLiquidatedVaults: true
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

  private saveStorage(val: userStorage) {
    window.localStorage.setItem(
      LocalStorage.#storageName,
      JSON.stringify({ [this.currentUser]: val, rpcUrl: this.rpcUrl })
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

  public addFarms(farms: Array<AvailableInvestment>) {
    const newFarms = Array.from(new Set([...this.farms, ...farms]));
    this.farms = newFarms;
    const storage: userStorage = {
      version: this.version,
      farms: newFarms,
      lastActiveLevel: this.lastActiveLevel,
      showLiquidatedVaults: this.showLiquidatedVaults
    };
    this.saveStorage(storage);
  }

  public removeFarms(farms: Array<AvailableInvestment>) {
    const newFarms = this.farms.filter(farm => !farms.includes(farm));
    this.farms = newFarms;
    const storage: userStorage = {
      version: this.version,
      farms: newFarms,
      lastActiveLevel: this.lastActiveLevel,
      showLiquidatedVaults: this.showLiquidatedVaults
    };
    this.saveStorage(storage);
  }

  public updateLastActiveLevel(level: number) {
    this.lastActiveLevel = level;
    this.saveStorage({
      version: this.version,
      farms: this.farms,
      lastActiveLevel: level,
      showLiquidatedVaults: this.showLiquidatedVaults
    });
  }

  public updateLiquidatedVaultsDisplay(show: boolean) {
    this.showLiquidatedVaults = show;
    this.saveStorage({
      version: this.version,
      farms: this.farms,
      lastActiveLevel: this.lastActiveLevel,
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
}
