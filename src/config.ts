import { AvailableFiat } from "./types";

export default {
  version: "4.7.5",
  mtdFee: 0.003,
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
  kusdLiquidityPoolAddress: "KT1AxaBxkFLCUi3f8rdDAAxBKHfzY8LfKDRA",
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
    { code: AvailableFiat.RUB, name: "Russian ruble", symbol: "₽" },
    { code: AvailableFiat.CNY, name: "Chinese yuan", symbol: "¥" },
    { code: AvailableFiat.BTC, name: "Bitcoin", symbol: "₿" }
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
    "PLENTY-YOU-LP": "KT1EM6NjJdJXmz3Pj13pfu3MWVDwXEQnoH3N",
    "PLENTY-Ctez-LP": "KT1C9gJRfkpPbNdBn3XyYbrUHT6XgfPzZqXP",
    "uUSD-YOU-LP": "KT1TnrLFrdemNZ1AnnWNfi21rXg7eknS484C",
    "uUSD-wUSDC-LP": "KT1JbUFVGrMCpW39UtH97dMkG2nMMrefQLLa",
    "uUSD-uDEFI-LP": "KT1EAw8hL5zseB3SLpJhBqPQfP9aWrWh8iMW",
    "Ctez-kUSD-LP": "KT1X1nkqJDR1UHwbfpcnME5Z7agJLjUQNguB",
    "Ctez-PAUL-LP": "KT1LixgLzdK4nseeD6MmmVpokuw9CvpVX9KW",
    "Ctez-wWBTC-LP": "KT1XPUvZHc1YKTJYnGbB755V95hDgvS1qQYf",
    "Ctez-USDtz-LP": "KT1PWAXfPatPWBNJUxTHin4ECin1kYJHHnsr",
    "Ctez-wUSDC-LP": "KT1PZpbmKtGE6ZyYeF8entfjuGGT7CRUCF5g",
    "Ctez-wUSDT-LP": "KT1AfTwam4bNPawLv4bWqSj9GsVDPsf5F5bQ",
    "Ctez-wBUSD-LP": "KT1GN7PHpFsH43ypFyE2hxNMdxqTuiCGm4Pm",
    "Ctez-wDAI-LP": "KT1L5qd9xPWjiEX6ZNovhaty228ASg6jCE5p",
    "Ctez-KALAM-LP": "KT1HuZVo3ZKRhkaHDsYXZ2fvmVfkY1FrbEDj",
    "Ctez-GIF-LP": "KT1VnFPwDGJRt5ufMgcWafM2WWcZCC77gpT3",
    "Ctez-ETHtz-LP": "KT1GSYhwanehtwCK3NPfkMFbD1bNQmvosbqL",
    "Ctez-QUIPU-LP": "KT1Ss8rb1UFVqG2LYEU5g4NEbK5SqW5Xadwp",
    "Ctez-hDAO-LP": "KT1RSxExbbRwQdYBpRHWup9vxvw1Hp25vFVM",
    "Ctez-kDAO-LP": "KT1SP9WsMeLFTiHBXqEumTASYbF3CXh22aVV",
    "Ctez-wWETH-LP": "KT1WwqM2MH38PSQbECxPngBVLSbqJUHzCFAH",
    "Ctez-uUSD-LP": "KT1Rx3pQzsn4FBuuYhcWsqUS7vWFx3ktqSWD",
    "Ctez-FLAME-LP": "KT1Bp3JAeeMP4GvJaspFw6zah6WydqqqHPNw",
    "Ctez-SMAK-LP": "KT1Qg4FmXDmViQgyYLT5QkgZQSmPKvKjZbzn",
    "Ctez-crDAO-LP": "KT1JkHBYp3Pq4TRSkFdc2CRoXFgDkJrfCqUe",
    "Ctez-PXL-LP": "KT1WR19YA8Go6GbTvtrMpUEEGSuQYxgz2ZVW",
    "Ctez-UNO-LP": "KT1XLFZ2RS8vCUmHwBG39mq7zELhnLKn9JUz",
    "Ctez-WRAP-LP": "KT19Qe4KbEVAiaVeNsgo9Tkqa6qvZho8c4W5",
    "Ctez-tzBTC-LP": "KT1Wryxte8NnVCm569yb8dcSPmvFBVs4ufD6",
    "Ctez-INSTA-LP": "KT1EnESbHxmzd2XeENyYNege4L5TKxeatJk9",
    "Ctez-CRUNCH-LP": "KT1WZztBneC9NrhVqvo9yXq8St7p8c1JVTxm"
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
    "wWETH-ETHtz-LP": "KT1GubVxQVJucUJfJvysvAJKWpLwj3LKuWHn",
    "PLENTY-Ctez-LP": "KT1LdX5pUkZZGwYPePcAFSpETbqfbGCwJpfw",
    "uUSD-YOU-LP": "KT1Tmncfgpp4ZSp6aEogL7uhBqHTiKsSPegK",
    "uUSD-wUSDC-LP": "KT1A2W6mBjn49yqzjJbt9T7xNVD9gDeL45qD",
    "uUSD-uDEFI-LP": "KT1RQvdYD9yc763j8FiVLyXbKPVVbZqGRx5m",
    "Ctez-kUSD-LP": "KT19bFNh8pZCRtTy7Pi9kpEcb2Yd7KWArAik",
    "Ctez-USDtz-LP": "KT1DQfEUBsaZo43G3j1CbFF9BiWZXS72DuCh",
    "Ctez-wUSDC-LP": "KT1SXZTX9ZCW5atMnBng1y4pmdS2xi231oMt",
    "Ctez-wUSDT-LP": "KT1KgCx6CYVSyLxfiFdo5hVuMwZBPQy1XZaf",
    "Ctez-wBUSD-LP": "KT1K7GRKUWzfNJ9jzGprb13XDVqqp6GE67ZU",
    "Ctez-wDAI-LP": "KT1VLLdUaMfFbJw87b1PaVG1ac6UYM5xzqC5",
    "Ctez-KALAM-LP": "KT1N3mKQMnWEwt4FB3J4qP2X8LwYgndGDZrn",
    "Ctez-GIF-LP": "KT1KdPxrn7UTx6CUWxuUBaGx4bVv6ZJKWUWr",
    "Ctez-ETHtz-LP": "KT1GAvdLT9tkpKkRmkuChuL9T83esBtatgKm",
    "Ctez-QUIPU-LP": "KT1C6Q4Mnnpns8vSQy7kJitZNMsED24SMw9m",
    "Ctez-hDAO-LP": "KT1DidqBuSaxGbVaDq2gLVkfh262dYyoGeSH",
    "Ctez-kDAO-LP": "KT1KmkH1T2CQV2Q5AcMeZy3GHhwNac48FBap",
    "Ctez-wWETH-LP": "KT1BAiXZkKG4R9W7LAKiAQahC8Wg7ZpJBaEs",
    "Ctez-uUSD-LP": "KT1BX8F7Xrtsy1tJ91iLovu4nJ8ZyVv4Dac2",
    "Ctez-FLAME-LP": "KT1UfvQiYexnpag6rZ3LMGsn5YFiEHrXrtbq",
    "Ctez-SMAK-LP": "KT1NeR3ExLddfdAbs5nwpQMm6DqBekyJTc4R",
    "Ctez-crDAO-LP": "KT1MQcJCLZL8ASHYGmT5LVzeXV64ruy7RAuH",
    "Ctez-PXL-LP": "KT1GhzTxzgXgdv1rRCppAB5D4poXiUgp8yoU",
    "Ctez-UNO-LP": "KT1WKWhTNMY4h4eHunbsnJ1oAtDWXCz4qNQm",
    "Ctez-WRAP-LP": "KT1MX73dim8HKqQLjTHvkJnpRUp37C1HXdkt",
    "Ctez-wWBTC-LP": "KT1XWRUcvtcgpsETcasdUnNkq9rJeWmz8ihD",
    "Ctez-tzBTC-LP": "KT1TMZjKBvSVKzETZTyRsTxYEu4uZLLs6VpJ",
    "Ctez-PAUL-LP": "KT1N93veCzepAPydFGGUhDFiA69PoawasxXi",
    "Ctez-INSTA-LP": "KT1GkTwzN2gR6UdBicDSu2JEaRtv5KAPunrj",
    "Ctez-CRUNCH-LP": "KT1QSA2SMDEKzEnJhGrVGheWb94Ux8Wyfuy6"
  },
  wrapLiquidityMiningDexAddress: {
    "WRAP-XTZ-LM": "KT1FG63hhFtMEEEtmBSX2vuFmP87t9E7Ab4t",
    "wBUSD-XTZ-LM": "KT1UMAE2PBskeQayP5f2ZbGiVYF7h8bZ2gyp",
    "wDAI-XTZ-LM": "KT1PQ8TMzGMfViRq4tCMFKD2QF5zwJnY67Xn",
    "wUSDC-XTZ-LM": "KT1U2hs5eNdeCpHouAvQXGMzGFGJowbhjqmo",
    "wUSDT-XTZ-LM": "KT1T4pfr6NL8dUiz8ibesjEvH2Ne3k6AuXgn",
    "wWBTC-XTZ-LM": "KT1DksKXvCBJN7Mw6frGj6y6F3CbABWZVpj1",
    "wWETH-XTZ-LM": "KT1DuYujxrmgepwSDHtADthhKBje9BosUs1w"
  },
  vortexDexAddresses: {
    "PLENTY-XTZ": "KT1VSjJxNq98AkPfVktpCv82hacrvgkb6hEu",
    "uUSD-XTZ": "KT1ND1bkLahTzVUt93zbDtGugpWcL23gyqgQ"
  }
};
