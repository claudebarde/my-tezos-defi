import { AvailableFiat } from "./types";

export default {
  version: "3.5.0",
  wrapTokenIds: {
    0: { name: "wAAVE", decimals: 18 },
    1: { name: "wBUSD", decimals: 18 },
    2: { name: "wCEL", decimals: 4 },
    3: { name: "wCOMP", decimals: 18 },
    4: { name: "wCRO", decimals: 8 },
    5: { name: "wDAI", decimals: 18 },
    6: { name: "wFTT", decimals: 18 },
    7: { name: "wHT", decimals: 18 },
    8: { name: "wHUSD", decimals: 8 },
    9: { name: "wLEO", decimals: 18 },
    10: { name: "wLINK", decimals: 18 },
    11: { name: "wMATIC", decimals: 18 },
    12: { name: "wMKR", decimals: 18 },
    13: { name: "wOKB", decimals: 18 },
    14: { name: "wPAX", decimals: 18 },
    15: { name: "wSUSHI", decimals: 18 },
    16: { name: "wUNI", decimals: 18 },
    17: { name: "wUSDC", decimals: 6 },
    18: { name: "wUSDT", decimals: 6 },
    19: { name: "wWBTC", decimals: 8 },
    20: { name: "wWETH", decimals: 18 }
  },
  kolibriOvenOwnersUrl:
    "https://kolibri-data.s3.amazonaws.com/mainnet/oven-key-data.json",
  quipuswapFactories: {
    fa1_2Factory: [
      "KT1FWHLMk5tHbwuSsp31S4Jum4dTVmkXpfJw",
      "KT1Lw8hCoaBrHeTeMXbqHPG4sS4K1xn7yKcD"
    ],
    fa2Factory: [
      "KT1PvEyN1xCFCgorN92QCfYjw3axS6jawCiJ",
      "KT1SwH9P1Tx8a58Mm6qBExQFTcy2rwZyZiXS"
    ]
  },
  plentyWithdrawalFeeSchema:
    // number of levels since staking: percentage
    {
      general: [
        [12288, 10],
        [8192, 12.5],
        [4096, 25]
      ],
      zeroPerCent: 12288
    },
  validFiats: [
    { code: AvailableFiat.USD, name: "US dollar", symbol: "$" },
    { code: AvailableFiat.EUR, name: "Euro", symbol: "€" },
    { code: AvailableFiat.CAD, name: "Canadian Dollar", symbol: "CA$" },
    { code: AvailableFiat.GBP, name: "British pound", symbol: "£" },
    { code: AvailableFiat.SGD, name: "Singapore dollar", symbol: "S$" },
    { code: AvailableFiat.KRW, name: "South Korea won", symbol: "₩" }
  ],
  toastColor: {
    green: {
      theme: {
        "--toastBackground": "#48BB78",
        "--toastProgressBackground": "#2F855A"
      }
    },
    red: {
      theme: {
        "--toastBackground": "#F56565",
        "--toastProgressBackground": "#C53030"
      }
    }
  },
  lbContracts: [
    "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5",
    "KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo"
  ],
  plentyDexAddresses: {
    "PLENTY-wBUSD": "KT1XXAavg3tTj12W1ADvd3EEnm1pu6XTmiEF",
    "PLENTY-wUSDC": "KT1PuPNtDFLR6U7e7vDuxunDoKasVT6kMSkz",
    "PLENTY-wWBTC": "KT19Dskaofi6ZTkrw3Tq4pK7fUqHqCz4pTZ3",
    "PLENTY-USDtz-LP": "KT1D36ZG99YuhoCRZXLL86tQYAbv36bCq9XM",
    "PLENTY-wMATIC-LP": "KT1VeNQa4mucRj36qAJ9rTzm4DTJKfemVaZT",
    "PLENTY-wLINK-LP": "KT1XVrXmWY9AdVri6KpxKo4CWxizKajmgzMt"
  }
};
