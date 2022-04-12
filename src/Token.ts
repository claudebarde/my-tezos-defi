import type { TezosContractAddress } from "./types";
import type { AvailableDex } from "./types";

export default class Token {
  address: TezosContractAddress;
  dexContractAddress: TezosContractAddress;
  decimals: number;
  ledgerPath: string;
  ledgerKey: "address" | ["address", number] | [string, "address"];
  type: "fa1.2" | "fa2";
  color: string;
  exchangeRates: { [p in AvailableDex]: null | number };
  tokenId?: number; // only for fa2 contracts;
  thumbnail?: string;
  websiteLink?: string;

  constructor(data) {
    this.address = data.address;
    this.dexContractAddress = data.dexContractAddress;
    this.decimals = data.decimals;
    this.ledgerPath = data.ledgerPath;
    this.ledgerKey = data.ledgerKey;
    this.type = data.type;
    this.color = data.color;
    this.tokenId = data.tokenId;
    this.thumbnail = data.thumbnail;
    this.websiteLink = data.websiteLink;
    this.exchangeRates = { quipu: null, plenty: null, vortex: null };
  }

  setExchangeRate(p: Array<{ rate: number; dex: AvailableDex }>): void {
    p.forEach(item => (this.exchangeRates[item.dex] = item.rate));
  }

  getExchangeRate(dex?: AvailableDex): null | number {
    if (dex) {
      return this.exchangeRates[dex];
    } else {
      // if no DEX is provided, returns an average of all DEXes
      return Object.values(this.exchangeRates)
        .map(rate => (!rate ? 0 : rate))
        .reduce((a, b) => a + b);
    }
  }
}
