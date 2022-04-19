import type { TezosToolkit } from "@taquito/taquito";
import type { BeaconWallet } from "@taquito/beacon-wallet";
import type Token from "./Token";
import type { LocalStorage } from "./localStorage";

export type TezosContractAddress = `KT1${string}`;
export type TezosAccountAddress = `tz${"1" | "2" | "3"}${string}`;

export type TokenAmount = number;
export enum AvailableToken {
  kUSD = "kUSD",
  hDAO = "hDAO",
  PLENTY = "PLENTY",
  xPLENTY = "xPLENTY",
  wXTZ = "wXTZ",
  STKR = "STKR",
  tzBTC = "tzBTC",
  USDtz = "USDtz",
  ETHtz = "ETHtz",
  CRUNCH = "CRUNCH",
  WRAP = "WRAP",
  wAAVE = "wAAVE",
  wBUSD = "wBUSD",
  wCEL = "wCEL",
  wCOMP = "wCOMP",
  wCRO = "wCRO",
  wDAI = "wDAI",
  wFTT = "wFTT",
  wHT = "wHT",
  wHUSD = "wHUSD",
  wLEO = "wLEO",
  wLINK = "wLINK",
  wMATIC = "wMATIC",
  wMKR = "wMKR",
  wOKB = "wOKB",
  wPAX = "wPAX",
  wSUSHI = "wSUSHI",
  wUNI = "wUNI",
  wUSDC = "wUSDC",
  wUSDT = "wUSDT",
  wWBTC = "wWBTC",
  wWETH = "wWETH",
  crDAO = "crDAO",
  FLAME = "FLAME",
  KALAM = "KALAM",
  PAUL = "PAUL",
  SMAK = "SMAK",
  GOT = "GOT",
  HERA = "HERA",
  kDAO = "kDAO",
  QUIPU = "QUIPU",
  uUSD = "uUSD",
  YOU = "YOU",
  ctez = "ctez",
  MAG = "MAG",
  PXL = "PXL",
  pxlDAO = "pxlDAO",
  fDAO = "fDAO",
  BTCtz = "BTCtz",
  IDZ = "IDZ",
  GIF = "GIF",
  TezDAO = "TezDAO",
  uBTC = "uBTC",
  ANTI = "ANTI"
}
export enum AvailableFiat {
  USD = "USD",
  EUR = "EUR",
  CAD = "CAD",
  GBP = "GBP",
  SGD = "SGD",
  RUB = "RUB",
  CNY = "CNY",
  BTC = "BTC"
}
export enum AvailableInvestment {
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
  "PLENTY-wDAI-LP" = "PLENTY-wDAI-LP",
  "PLENTY-Ctez-LP" = "PLENTY-Ctez-LP",
  "xPLENTY-Staking" = "xPLENTY-Staking",
  "uUSD-YOU-LP" = "uUSD-YOU-LP",
  "uUSD-wUSDC-LP" = "uUSD-wUSDC-LP",
  "uUSD-uDEFI-LP" = "uUSD-uDEFI-LP",
  "Ctez-kUSD-LP" = "Ctez-kUSD-LP",
  "QUIPUSWAP-PLENTY" = "QUIPUSWAP-PLENTY",
  "QUIPUSWAP-KUSD" = "QUIPUSWAP-KUSD",
  "QUIPUSWAP-USDtz" = "QUIPUSWAP-USDtz",
  "QUIPUSWAP-ETHtz" = "QUIPUSWAP-ETHtz",
  "QUIPUSWAP-CRUNCH" = "QUIPUSWAP-CRUNCH",
  "CRUNCHY-FARMS" = "CRUNCHY-FARMS",
  "PAUL-PAUL" = "PAUL-PAUL",
  "PAUL-XTZ" = "PAUL-XTZ",
  "MAG-XTZ" = "MAG-XTZ",
  "QUIPU-PAUL" = "QUIPU-PAUL",
  "wWBTC-PAUL" = "wWBTC-PAUL",
  "wUSDC-PAUL" = "wUSDC-PAUL",
  "wWETH-PAUL" = "wWETH-PAUL",
  "PAUL-uUSD" = "PAUL-uUSD",
  "PAUL-kUSD-uUSD" = "PAUL-kUSD-uUSD",
  "KUSD-QUIPU-LP" = "KUSD-QUIPU-LP",
  "KUSD-KDAO" = "KUSD-KDAO",
  "KUSD-QL" = "KUSD-QL",
  "KDAO-KUSD-UUSD" = "KDAO-KUSD-UUSD",
  "WRAP-STACKING" = "WRAP-STACKING",
  "WRAP-XTZ-LM" = "WRAP-XTZ-LM",
  "wAAVE-XTZ-LM" = "wAAVE-XTZ-LM",
  "wBUSD-XTZ-LM" = "wBUSD-XTZ-LM",
  "wCEL-XTZ-LM" = "wCEL-XTZ-LM",
  "wCOMP-XTZ-LM" = "wCOMP-XTZ-LM",
  "wCRO-XTZ-LM" = "wCRO-XTZ-LM",
  "wDAI-XTZ-LM" = "wDAI-XTZ-LM",
  "wFTT-XTZ-LM" = "wFTT-XTZ-LM",
  "wHT-XTZ-LM" = "wHT-XTZ-LM",
  "wHUSD-XTZ-LM" = "wHUSD-XTZ-LM",
  "wLEO-XTZ-LM" = "wLEO-XTZ-LM",
  "wLINK-XTZ-LM" = "wLINK-XTZ-LM",
  "wMATIC-XTZ-LM" = "wMATIC-XTZ-LM",
  "wMKR-XTZ-LM" = "wMKR-XTZ-LM",
  "wOKB-XTZ-LM" = "wOKB-XTZ-LM",
  "wPAX-XTZ-LM" = "wPAX-XTZ-LM",
  "wSUSHI-XTZ-LM" = "wSUSHI-XTZ-LM",
  "wUNI-XTZ-LM" = "wUNI-XTZ-LM",
  "wUSDC-XTZ-LM" = "wUSDC-XTZ-LM",
  "wUSDT-XTZ-LM" = "wUSDT-XTZ-LM",
  "wWBTC-XTZ-LM" = "wWBTC-XTZ-LM",
  "wWETH-XTZ-LM" = "wWETH-XTZ-LM",
  "WRAP-FM" = "WRAP-FM",
  "WRAP-wAAVE-FM" = "WRAP-wAAVE-FM",
  "WRAP-wBUSD-FM" = "WRAP-wBUSD-FM",
  "WRAP-wCEL-FM" = "WRAP-wCEL-FM",
  "WRAP-wCOMP-FM" = "WRAP-wCOMP-FM",
  "WRAP-wCRO-FM" = "WRAP-wCRO-FM",
  "WRAP-wDAI-FM" = "WRAP-wDAI-FM",
  "WRAP-wFTT-FM" = "WRAP-wFTT-FM",
  "WRAP-wHT-FM" = "WRAP-wHT-FM",
  "WRAP-wHUSD-FM" = "WRAP-wHUSD-FM",
  "WRAP-wLEO-FM" = "WRAP-wLEO-FM",
  "WRAP-wLINK-FM" = "WRAP-wLINK-FM",
  "WRAP-wMATIC-FM" = "WRAP-wMATIC-FM",
  "WRAP-wMKR-FM" = "WRAP-wMKR-FM",
  "WRAP-wOKB-FM" = "WRAP-wOKB-FM",
  "WRAP-wPAX-FM" = "WRAP-wPAX-FM",
  "WRAP-wSUSHI-FM" = "WRAP-wSUSHI-FM",
  "WRAP-wUNI-FM" = "WRAP-wUNI-FM",
  "WRAP-wUSDC-FM" = "WRAP-wUSDC-FM",
  "WRAP-wUSDT-FM" = "WRAP-wUSDT-FM",
  "WRAP-wWBTC-FM" = "WRAP-wWBTC-FM",
  "WRAP-wWETH-FM" = "WRAP-wWETH-FM",
  "YOUVES-UUSD-WUSDC" = "YOUVES-UUSD-WUSDC",
  "YOUVES-UUSD-UBTC" = "YOUVES-UUSD-UBTC",
  "YOUVES-UUSD-KUSD" = "YOUVES-UUSD-KUSD",
  "YOUVES-UUSD-USDTZ" = "YOUVES-UUSD-USDTZ",
  "YOUVES-YOU-UBTC" = "YOUVES-YOU-UBTC",
  "YOUVES-YOU-UUSD" = "YOUVES-YOU-UUSD",
  "YOUVES-YOU-UDEFI" = "YOUVES-YOU-UDEFI",
  "SMLK-XTZ-ANTI" = "SMLK-XTZ-ANTI",
  "QUIPU-FARM-0" = "QUIPU-FARM-0",
  "QUIPU-FARM-1" = "QUIPU-FARM-1",
  "QUIPU-FARM-2" = "QUIPU-FARM-2",
  "QUIPU-FARM-3" = "QUIPU-FARM-3",
  "QUIPU-FARM-4" = "QUIPU-FARM-4"
}

export type InvestmentPlatform =
  | "plenty"
  | "quipuswap"
  | "crunchy"
  | "paul"
  | "kdao"
  | "wrap"
  | "smartlink"
  | "youves";

export enum AvailableDex {
  QUIPU = "quipu",
  PLENTY = "plenty",
  VORTEX = "vortex"
}

export enum AvailableVault {
  WXTZ = "wXTZ",
  KDAO = "kDAO",
  YOUVES = "youves",
  CTEZ = "ctez"
}

export interface UserToken {
  name: AvailableToken;
  balance: number;
}

export type IconValue = AvailableToken | "XTZ" | "QUIPUSWAP" | "crDAO" | "user";
export type IconSet = IconValue[];

export interface InvestmentData {
  id: AvailableInvestment;
  platform: InvestmentPlatform;
  type: string;
  address: TezosContractAddress;
  balance: number | undefined;
  decimals: number;
  info: any;
  icons: IconSet;
  rewardToken: undefined | AvailableToken;
  favorite: boolean;
  liquidityToken: boolean;
  alias?: string;
  shareValueInTez?: number;
  totalSupply?: number;
}

export interface State {
  isAppReady: boolean;
  settings: { rpcUrl: string; defiData: string };
  Tezos: TezosToolkit | undefined;
  wallet: BeaconWallet | undefined;
  userAddress: TezosAccountAddress | undefined;
  userName: string | undefined;
  userBalance: number | undefined;
  userTokens: Array<UserToken> | undefined;
  xtzExchangeRate: number | undefined;
  xtzPriceHistoric: Array<{ timestamp: string; price: number }>;
  tokens: { [p in AvailableToken]: Token } | undefined;
  investments:
    | {
        [p in AvailableInvestment]: InvestmentData;
      }
    | undefined;
  currentLevel: number;
  serviceFee: number;
  admin: TezosAccountAddress;
  localStorage: LocalStorage | undefined;
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

export enum ToastType {
  INFO,
  ERROR,
  SUCCESS,
  WARNING
}
