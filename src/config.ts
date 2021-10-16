import { AvailableFiat } from "./types";

export default {
  version: "4.1.0",
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
    { code: AvailableFiat.RUB, name: "Russian ruble", symbol: "₽" }
  ],
  stablecoins: ["kUSD", "USDtz", "uUSD", "wUSDC", "wDAI", "wUSDT"],
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
    "PLENTY-wLINK-LP": "KT1XVrXmWY9AdVri6KpxKo4CWxizKajmgzMt",
    "PLENTY-QUIPU-LP": "KT1NtsnKQ1c3rYB12ZToP77XaJs8WDBvF221",
    "PLENTY-tzBTC-LP": "KT1HaDP8fRW7kavK2beST7o4RvzuvZbn5VwV",
    "PLENTY-WRAP-LP": "KT1C2SXoGcje3VVMJHKRVhYXuWuNmv5ztJcw",
    "PLENTY-UNO-LP": "KT1Wu8fGYxX5DfxYP8P97ZUNzrXFKjsWm7dD",
    "PLENTY-SMAK-LP": "KT1BEC9uHmADgVLXCm3wxN52qJJ85ohrWEaU",
    "PLENTY-KALAM-LP": "KT1HZkD2T4uczgYkZ6fb9gm1fymeJoRuezLz",
    "PLENTY-hDAO-LP": "KT1XutoFJ9dXvWxT7ttG86N2tSTUEpatFVTm",
    "PLENTY-ETHtz-LP": "KT1AbuUaPQmYLsB8n8FdSzBrxvrsm8ctwW1V",
    "PLENTY-wWETH-LP": "KT1HUnqM6xFJa51PM2xHfLs7s6ARvXungtyq",
    "PLENTY-kUSD-LP": "KT1UNBvCJXiwJY6tmHM7CJUVwNPew53XkSfh",
    "PLENTY-uUSD-LP": "KT1Cba383ZJpEearqnUyUKUMsgu5Z3TXBgeH",
    "PLENTY-wUSDT": "KT1Bi4yoALg6tuP4PKaFNDtSsDdpGLrDiGAS",
    "PLENTY-wDAI-LP": "KT1KDmpYSDogNtEtEnEaHQLaySuqLr8aEfJW",
    "PLENTY-YOU": "KT1EM6NjJdJXmz3Pj13pfu3MWVDwXEQnoH3N"
  },
  plentyLptAddresses: {
    "PLENTY-wBUSD-LP": "KT1UC3vcVZ4K9b39uQxaMNA2N1RuJXKLCnoA",
    "PLENTY-wUSDC-LP": "KT1Gz1mx1jm7JHqU7GuMVWF6soB9RjsfLN3o",
    "PLENTY-wWBTC-LP": "KT1La1qZiJtDRcd9ek8w5KYD47i9MQqAQHmP",
    "PLENTY-wMATIC-LP": "KT1WCGPFvy97wwGxewKfvTr1QYPvpEgUKToS",
    "PLENTY-wLINK-LP": "KT1Brqb3JvXNKzwjW82F8pUAxQ7ipCfApWki",
    "PLENTY-USDtz-LP": "KT18qSo4Ch2Mfq4jP3eME7SWHB8B8EDTtVBu",
    "PLENTY-hDAO-LP": "KT1B2SzTBtb7PgTePbDLV5BmUZQ2PC1sdSHZ",
    "PLENTY-ETHtz-LP": "KT1VvcbAjMWHVUbhLENpiVBejbzXYDt3PusE",
    "PLENTY-wWETH-LP": "KT1SULRhejhoBWUmMnU53YHJrQZ3rxqsamdm",
    "PLENTY-kUSD-LP": "KT1XTpd8JPexGxBL2dAmU9h2o9fcd9LEUG2t",
    "PLENTY-QUIPU-LP": "KT1VDSyTqS95wkB4tRGy6saMa4izRKwrEg26",
    "PLENTY-tzBTC-LP": "KT1SqQimKz3RbQbckpSHhn4nanUmDuRqkFH3",
    "PLENTY-WRAP-LP": "KT1AHndbp9xVpaJrfTHfYzSXKHDVHMdKxcW2",
    "PLENTY-UNO-LP": "KT1B6ALzWXQp5wUavuo2VTMNjRdTGm8wx37w",
    "PLENTY-KALAM-LP": "KT1G3QTnrpWNhZr9x3Prprw3GH6gAMqV113D",
    "PLENTY-SMAK-LP": "KT1NLZah1MKeWuveQvdsCqAUCjksKw8J296z",
    "PLENTY-uUSD-LP": "KT1E8CrG6uznYAG9vZVGtApMJwwTScxPEUKq",
    "PLENTY-wUSDT-LP": "KT1PcM1LUqgVdkXqKvZ4CeC9aiwLgYYCEHMH",
    "PLENTY-wDAI-LP": "KT19vdNapeT6MALXvkvW745KiVKGXmD4AZq5",
    "PLENTY-YOU-LP": "KT1UaU5fbSYqYeFmhmsjLkqQXZ1ZG54Qs2vh",
    "kUSD-USDtz-LP": "KT1HEdGi7rq1zgZ68dhAtKMZYKeD3EM5vYdf",
    "wUSDC-USDtz-LP": "KT1FaoPYSyT4itmgTncvdshV7SeqqXk9RJXd",
    "wWETH-ETHtz-LP": "KT1GubVxQVJucUJfJvysvAJKWpLwj3LKuWHn"
  }
};
