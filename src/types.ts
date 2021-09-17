import type { TezosToolkit, WalletOperation } from "@taquito/taquito";
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
  CRDAO = "crDAO",
  FLAME = "FLAME",
  KALAM = "KALAM",
  wLINK = "wLINK",
  wMATIC = "wMATIC",
  wUSDC = "wUSDC",
  wBUSD = "wBUSD",
  PAUL = "PAUL",
  SMAK = "SMAK",
  GOT = "GOT",
  HERA = "HERA",
  KDAO = "kDAO",
  QUIPU = "QUIPU",
  uUSD = "uUSD",
  YOU = "YOU"
}
export enum AvailableFiat {
  USD = "USD",
  EUR = "EUR",
  CAD = "CAD",
  GBP = "GBP",
  SGD = "SGD",
  RUB = "RUB"
}
export enum AvailableInvestments {
  "PLENTY-XTZ-LP" = "PLENTY-XTZ-LP",
  "PLENTY-hDAO-LP" = "PLENTY-hDAO-LP",
  "PLENTY-ETHtz-LP" = "PLENTY-ETHtz-LP",
  "PLENTY-wBUSD" = "PLENTY-wBUSD",
  "PLENTY-wUSDC" = "PLENTY-wUSDC",
  "PLENTY-wWBTC" = "PLENTY-wWBTC",
  "PLENTY-USDtz-LP" = "PLENTY-USDtz-LP",
  "PLENTY-wMATIC-LP" = "PLENTY-wMATIC-LP",
  "PLENTY-wLINK-LP" = "PLENTY-wLINK-LP",
  "PLENTY-QUIPU-LP" = "PLENTY-QUIPU-LP",
  "PLENTY-kUSD-LP" = "PLENTY-kUSD-LP",
  "PLENTY-wWETH-LP" = "PLENTY-wWETH-LP",
  "PLENTY-tzBTC-LP" = "PLENTY-tzBTC-LP",
  "PLENTY-WRAP-LP" = "PLENTY-WRAP-LP",
  "PLENTY-UNO-LP" = "PLENTY-UNO-LP",
  "PLENTY-SMAK-LP" = "PLENTY-SMAK-LP",
  "PLENTY-KALAM-LP" = "PLENTY-KALAM-LP",
  "QUIPUSWAP-PLENTY" = "QUIPUSWAP-PLENTY",
  "QUIPUSWAP-KUSD" = "QUIPUSWAP-KUSD",
  "QUIPUSWAP-USDtz" = "QUIPUSWAP-USDtz",
  "QUIPUSWAP-ETHtz" = "QUIPUSWAP-ETHtz",
  "QUIPUSWAP-CRUNCH" = "QUIPUSWAP-CRUNCH",
  "CRUNCHY-FARMS" = "CRUNCHY-FARMS",
  "PAUL-PAUL" = "PAUL-PAUL",
  "PAUL-XTZ" = "PAUL-XTZ",
  "KUSD-QUIPU-LP" = "KUSD-QUIPU-LP",
  "KUSD-KDAO" = "KUSD-KDAO"
}

export type InvestmentPlatform =
  | "plenty"
  | "quipuswap"
  | "crunchy"
  | "paul"
  | "kdao";

export interface TokenContract {
  address: TezosContractAddress;
  dexContractAddress: TezosContractAddress;
  decimals: number;
  ledgerPath: string;
  ledgerKey: "address" | ["address", number] | [string, "address"];
  type: "fa1.2" | "fa2";
  color: string;
  exchangeRate: null | number; // token to XTZ
  tokenId?: number; // only for fa2 contracts;
  thumbnail?: string;
  websiteLink?: string;
}

export interface InvestmentData {
  id: AvailableInvestments;
  platform: InvestmentPlatform;
  address: TezosContractAddress;
  balance: number | undefined;
  decimals: number;
  info: any;
  icons: IconSet;
  token: undefined | AvailableToken;
  favorite: boolean;
  liquidityToken: boolean;
  alias?: string;
  shareValueInTez?: number;
  totalSupply?: number;
}

export type IconValue = AvailableToken | "XTZ" | "QUIPUSWAP" | "crDAO" | "user";
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

export interface ExchangeRateData {
  tokenToTez: number;
  tezToToken: number;
  realPriceInTez: number;
  realPriceInToken: number;
}

export interface State {
  network: "testnet" | "mainnet";
  currentLevel: number;
  Tezos: TezosToolkit;
  wallet: BeaconWallet;
  userAddress: TezosAccountAddress;
  settings: {
    testnet: {
      rpcUrl: string;
      validRpcUrls: { name: string; url: string }[];
    };
    mainnet: {
      rpcUrl: string;
      validRpcUrls: { name: string; url: string }[];
    };
  };
  tokens: { [p in AvailableToken]: TokenContract } | undefined;
  tokensBalances: { [p in AvailableToken]: number } | undefined;
  tokensExchangeRates:
    | {
        [p in AvailableToken]: ExchangeRateData | undefined;
      }
    | undefined;
  investments:
    | {
        [p in AvailableInvestments]: InvestmentData;
      }
    | undefined;
  lastOperations: Operation[];
  xtzData: {
    exchangeRate: number | undefined;
    balance: number;
    historic: { timestamp: number; rate: number }[];
  };
  serviceFee: null | number;
  admin: TezosAccountAddress;
  defiData: string;
  liquidityBaking:
    | {
        tokenPool: number;
        xtzPool: number;
        lqtTotal: number;
        balance: number;
      }
    | undefined;
  blurryBalances: boolean;
}

export interface HistoricalDataState {
  tokens:
    | {
        [p in AvailableToken]: {
          timestamp: number;
          rate: { tokenToTez: number; tezToToken: number };
        }[];
      }
    | undefined;
}

export interface KolibriOvenData {
  address: string;
  locked: number;
  borrowed: number;
  isLiquidated: boolean;
}

export interface LocalStorageState {
  preferredFiat: AvailableFiat;
  pushNotifications: boolean;
  favoriteTokens: AvailableToken[];
  favoriteInvestments: AvailableInvestments[];
  wXtzVaults: TezosContractAddress[];
  lastUpdate: number;
}

export interface ComplexBatchedOp {
  id: string;
  type: "harvest" | "transfer" | "exchange" | "stake";
  origin: string;
  platform: InvestmentPlatform | undefined;
  op: WalletOperation | null;
}
