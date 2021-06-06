import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";

export type TezosContractAddress = `KT1${string}`;
export type TezosAccountAddress = `tz${"1" | "2" | "3"}${string}`;
export enum AvailableToken {
  KUSD = "kUSD",
  HDAO = "hDAO",
  PLENTY = "PLENTY",
  WXTZ = "wXTZ",
  STKR = "STKR",
  TZBTC = "tzBTC",
  USDTZ = "USDtz",
  ETHTZ = "ETHtz"
}

export interface TokenContract {
  address: {
    mainnet: TezosContractAddress;
    testnet: TezosContractAddress;
  };
  dexContractAddress: TezosContractAddress;
  decimals: number;
  ledgerPath: string;
  ledgerKey: "address" | ["address", number] | [string, "address"];
  type: "fa1.2" | "fa2";
  storage: any;
}

export interface State {
  network: "testnet" | "mainnet";
  Tezos: TezosToolkit;
  wallet: BeaconWallet;
  userAddress: TezosAccountAddress;
  settings: {
    testnet: any;
    mainnet: {
      rpcUrl: string;
    };
  };
  tokens: { [p in AvailableToken]: TokenContract };
  tokensBalances: { [p in AvailableToken]: number | undefined };
  tokensExchangeRates: {
    [p in AvailableToken]:
      | { tokenToTez: number; tezToToken: number }
      | undefined;
  };
  xtzFiatExchangeRate: number | undefined;
}
