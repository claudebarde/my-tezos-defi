import config from "./config";
import type { AvailableInvestment, TezosAccountAddress } from "./types";

export interface userStorage {
  version: string;
  farms: Array<AvailableInvestment>;
}
export interface localStorage {
  [p: TezosAccountAddress]: userStorage;
}

export class LocalStorage {
  private storageName = "mtd-storage";
  private currentUser: TezosAccountAddress;
  private version: string;
  private farms: Array<AvailableInvestment>;

  constructor(userAddress: TezosAccountAddress) {
    if (window && window.localStorage) {
      this.currentUser = userAddress;

      const localStorage = this.getStorage();
      if (localStorage) {
        this.version = localStorage.version;
        this.farms = localStorage.farms;
      } else {
        // new user
        const newStorage: userStorage = {
          version: config.version,
          farms: []
        };
        this.saveStorage(newStorage);
      }
    } else {
      console.error("local storage is not available");
    }
  }

  private getStorage(): userStorage | null {
    const localStorage = window.localStorage.getItem(this.storageName);
    if (localStorage) {
      const storage = JSON.parse(localStorage);
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
      this.storageName,
      JSON.stringify({ [this.currentUser]: val })
    );
  }

  public getVersion() {
    return this.version;
  }

  public getFarms() {
    return this.farms;
  }

  public addFarms(farms: Array<AvailableInvestment>) {
    const newFarms = Array.from(new Set([...this.farms, ...farms]));
    this.farms = newFarms;
    const storage: userStorage = { version: this.version, farms: newFarms };
    this.saveStorage(storage);
  }

  public removeFarms(farms: Array<AvailableInvestment>) {
    const newFarms = this.farms.filter(farm => !farms.includes(farm));
    this.farms = newFarms;
    const storage: userStorage = { version: this.version, farms: newFarms };
    this.saveStorage(storage);
  }
}
