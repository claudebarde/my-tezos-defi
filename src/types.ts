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
  ETHTZ = "ETHtz",
  CRUNCH = "CRUNCH",
  WRAP = "WRAP",
  WDAI = "wDAI",
  WWBTC = "wWBTC",
  SDAO = "sDAO",
  CRDAO = "crDAO",
  FLAME = "FLAME",
  KALAM = "KALAM"
}
export enum AvailableInvestments {
  "PLENTY-XTZ-LP" = "PLENTY-XTZ-LP",
  "PLENTY-hDAO" = "PLENTY-hDAO",
  "PLENTY-PLENTY" = "PLENTY-PLENTY",
  "PLENTY-ETHtz" = "PLENTY-ETHtz",
  "PLENTY-USDtz" = "PLENTY-USDtz",
  "QUIPUSWAP-PLENTY" = "QUIPUSWAP-PLENTY",
  "QUIPUSWAP-KUSD" = "QUIPUSWAP-KUSD",
  "QUIPUSWAP-USDtz" = "QUIPUSWAP-USDtz",
  "QUIPUSWAP-ETHtz" = "QUIPUSWAP-ETHtz",
  "QUIPUSWAP-CRUNCH" = "QUIPUSWAP-CRUNCH",
  "CRUNCHY-FARMS" = "CRUNCHY-FARMS"
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
  color: string;
}

export type IconValue = AvailableToken | "XTZ" | "QUIPU" | "crDAO" | "user";
export type IconSet = IconValue[];

export interface Operation {
  entryId: number;
  id: string;
  hash: string;
  level: number;
  timestamp: string;
  entrypoint: string;
  sender: { address: string; alias: string };
  target: { address: string; alias: string };
  amount: number;
  value: number;
  icons: IconSet;
  raw: any;
  tokenIds: number[] | null;
  status: "applied" | "failed" | "backtracked" | "skipped";
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
      | {
          tokenToTez: number;
          tezToToken: number;
          realPriceInTez: number;
          realPriceInToken: number;
        }
      | undefined;
  };
  investments: {
    [p in AvailableInvestments]: {
      address: { mainnet: TezosContractAddress; testnet: TezosContractAddress };
      balance: number | undefined;
      decimals: number;
      info: any;
      icons: IconSet;
      token: undefined | AvailableToken;
      alias?: string;
      shareValueInTez?: number;
    };
  };
  lastOperations: Operation[];
  firstLoading: boolean;
  xtzData: {
    exchangeRate: number | undefined;
    balance: number;
    historic: { timestamp: number; rate: number }[];
  };
}

export interface HistoricalDataState {
  tokens: {
    [p in AvailableToken]: {
      timestamp: number;
      rate: { tokenToTez: number; tezToToken: number };
    }[];
  };
}

export interface KolibriOvenData {
  address: string;
  locked: number;
  borrowed: number;
  isLiquidated: boolean;
}
