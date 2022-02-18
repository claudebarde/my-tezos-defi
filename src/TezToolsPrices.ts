import { validateContractAddress, validateAddress } from "@taquito/utils";

type TezosContractAddress = `KT1${string}`;
type TezosAccountAddress = `tz${"1" | "2" | "3"}${string}`;
enum tokenType {
  FA12 = "fa1.2",
  FA2 = "fa2",
  XTZ = "XTZ"
}
type dexName = "Quipuswap" | "Plenty";

type xtzPrice = {
  fullData: boolean; // if all the expected data has been received
  price: number | null;
  price24h: number | null;
  marketCap: number | null;
  market24h: number | null;
  volume: number | null;
  volume24h: number | null;
  updated: string | null;
};

interface TokenPairSide {
  symbol: string;
  pool: number;
  price: number;
  usdvalue: number;
  dayClose: number;
  weekClose: number;
  monthClose: number;
  tokenType: string;
}

interface TokenPair {
  address: TezosContractAddress;
  dex: dexName;
  symbols: string;
  tvl: number;
  lptSupply: number;
  sides: Array<TokenPairSide>;
}

interface TokenPrice {
  availableProperties: Array<string>;
  symbol: string | null;
  tokenAddress: { address: TezosContractAddress; isValid: boolean } | null;
  decimals: number | null;
  name: string | null;
  shouldPreferSymbol: boolean | null;
  factoryIndex: number | null;
  address: { address: TezosContractAddress; isValid: boolean } | null;
  ratio: number | null;
  tezPool: number | null;
  tokenPool: number | null;
  currentPrice: number | null;
  lastPrice: number | null;
  buyPrice: number | null;
  sellPrice: number | null;
  precision: number | null;
  type: tokenType | null;
  bakerValidator: TezosContractAddress | null;
  currentCandidate: TezosAccountAddress | null;
  currentDelegated: TezosAccountAddress | null;
  lastUpdateTime: string | null;
  lastVeto: string | null;
  periodFinish: string | null;
  reward: number | null;
  rewardPaid: number | null;
  rewardPerSec: number | null;
  totalReward: number | null;
  totalSupply: number | null;
  qptTokenSupply: number | null;
  totalVotes: number | null;
  usdValue: number | null;
  pairs: Array<TokenPair>;
  tags: string | null;
  websiteLink: { url: string; isValid: boolean } | null;
  telegramLink: { url: string; isValid: boolean } | null;
  twitterLink: { url: string; isValid: boolean } | null;
  discordLink: { url: string; isValid: boolean } | null;
  thumbnailUri: { url: string; isValid: boolean } | null;
  timestamp: string | null;
  block: string | null;
}

export default class TezToolsPrices {
  pricesApiUrl = "https://api.teztools.io/v1/prices";
  xtzPriceUrl = "https://api.teztools.io/v1/xtz-price";
  xtzPrice: xtzPrice;
  tokensPrices: Array<TokenPrice>;
  tokensList: Array<string>;
  defaultFiat = "USD";
  xtzExchangeRate: number;
  tokenTags: Array<string> = [];

  constructor() {
    this.tokensPrices = [];
    this.tokensList = [];
  }

  private is_number(val: any): boolean {
    return !isNaN(+val);
  }
  private is_timestamp(val: any): boolean {
    return new Date(val).getTime() > 0;
  }
  private is_string(val: any): boolean {
    return typeof val === "string";
  }
  private is_boolean(val: any): boolean {
    return typeof val === "boolean";
  }
  private is_url(val: any): boolean {
    try {
      new URL(val);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetches the token prices and the XTZ price
   * @param {Object[prices: boolean; xtzPrice: boolean; defaultFiat: string; fiatExchangeRate: number]} params Option to choose data fetched by the instance
   * @return {Promise<TezToolsPrices>} A promise with an instance of the class
   */
  async setup(p?: {
    prices?: boolean;
    xtzPrice?: boolean;
    defaultFiat?: string;
    fiatExchangeRate?: number;
  }): Promise<TezToolsPrices> {
    const prices = p && p.prices ? p.prices : true;
    const xtzPrice = p && p.xtzPrice ? p.xtzPrice : true;
    const defaultFiat = p && p.defaultFiat ? p.defaultFiat : "USD";
    const fiatExchangeRate =
      p && p.fiatExchangeRate ? p.fiatExchangeRate : undefined;
    if (prices) {
      // fetches tokens prices
      try {
        const response = await fetch(this.pricesApiUrl);
        if (response) {
          const data = await response.json();
          if (typeof data !== "object") {
            throw `Expected object from token prices API, got ${typeof data}`;
          } else if (
            typeof data === "object" &&
            !data.hasOwnProperty("contracts")
          ) {
            throw `Object received from token prices API doesn't have a "contracts" property`;
          } else if (
            typeof data === "object" &&
            data.hasOwnProperty("contracts") &&
            !Array.isArray(data.contracts)
          ) {
            throw `Expected contracts property from token prices API to be an array, got ${typeof data.contracts} instead`;
          } else {
            // right format
            data.contracts.forEach(contract => {
              let token: TokenPrice = {
                availableProperties: [],
                symbol: null,
                tokenAddress: null,
                decimals: null,
                name: null,
                shouldPreferSymbol: null,
                factoryIndex: null,
                address: null,
                ratio: null,
                tezPool: null,
                tokenPool: null,
                currentPrice: null,
                lastPrice: null,
                buyPrice: null,
                sellPrice: null,
                precision: null,
                type: null,
                bakerValidator: null,
                currentCandidate: null,
                currentDelegated: null,
                lastUpdateTime: null,
                lastVeto: null,
                periodFinish: null,
                reward: null,
                rewardPaid: null,
                rewardPerSec: null,
                totalReward: null,
                totalSupply: null,
                qptTokenSupply: null,
                totalVotes: null,
                usdValue: null,
                pairs: [],
                tags: null,
                websiteLink: null,
                telegramLink: null,
                twitterLink: null,
                discordLink: null,
                thumbnailUri: null,
                timestamp: null,
                block: null
              };
              const contractKeys = Object.keys(contract);
              contractKeys.forEach(contractKey => {
                token.availableProperties.push(contractKey);
                // validates data
                switch (contractKey) {
                  case "symbol":
                    const symbol = contract[contractKey];
                    if (this.is_string(symbol)) {
                      this.tokensList.push(symbol);
                      token.symbol = symbol;
                    } else {
                      token.symbol = null;
                    }
                    break;
                  case "tokenAddress":
                    const tokenAddress = contract[contractKey];
                    token.tokenAddress = {
                      address: this.is_string(tokenAddress)
                        ? tokenAddress
                        : null,
                      isValid:
                        validateContractAddress(tokenAddress) === 3
                          ? true
                          : false
                    };
                    break;
                  case "decimals":
                    const decimals = contract[contractKey];
                    token.decimals = this.is_number(decimals) ? decimals : null;
                    break;
                  case "name":
                    const name = contract[contractKey];
                    token.name = this.is_string(name) ? name : null;
                    break;
                  case "shouldPreferSymbol":
                    token.shouldPreferSymbol = this.is_boolean(
                      contract[contractKey]
                    )
                      ? contract[contractKey]
                      : null;
                    break;
                  case "factoryIndex":
                    const factoryIndex = contract[contractKey];
                    token.factoryIndex = this.is_number(factoryIndex)
                      ? factoryIndex
                      : null;
                    break;
                  case "address":
                    const address = contract[contractKey];
                    token.address = {
                      address: this.is_string(address) ? address : null,
                      isValid:
                        validateContractAddress(address) === 3 ? true : false
                    };
                    break;
                  case "ratio":
                    const ratio = contract[contractKey];
                    token.ratio = this.is_number(ratio) ? ratio : null;
                    break;
                  case "tezPool":
                    const tezPool = contract[contractKey];
                    token.tezPool = this.is_number(tezPool) ? tezPool : null;
                    break;
                  case "tokenPool":
                    const tokenPool = contract[contractKey];
                    token.tokenPool = this.is_number(tokenPool)
                      ? tokenPool
                      : null;
                    break;
                  case "currentPrice":
                    const currentPrice = contract[contractKey];
                    token.currentPrice = this.is_number(currentPrice)
                      ? currentPrice
                      : null;
                    break;
                  case "lastPrice":
                    const lastPrice = contract[contractKey];
                    token.lastPrice = this.is_number(lastPrice)
                      ? lastPrice
                      : null;
                    break;
                  case "buyPrice":
                    const buyPrice = contract[contractKey];
                    token.buyPrice = this.is_number(buyPrice) ? buyPrice : null;
                    break;
                  case "sellPrice":
                    const sellPrice = contract[contractKey];
                    token.sellPrice = this.is_number(sellPrice)
                      ? sellPrice
                      : null;
                    break;
                  case "precision":
                    const precision = contract[contractKey];
                    token.precision = this.is_number(precision)
                      ? precision
                      : null;
                    break;
                  case "type":
                    const type = contract[contractKey];
                    switch (type) {
                      case tokenType.FA12:
                        token.type = tokenType.FA12;
                        break;
                      case tokenType.FA2:
                        token.type = tokenType.FA2;
                        break;
                      case tokenType.XTZ:
                        token.type = tokenType.XTZ;
                        break;
                      default:
                        token.type = null;
                        break;
                    }
                    break;
                  case "bakerValidator":
                    const bakerValidator = contract[contractKey];
                    token.bakerValidator =
                      validateContractAddress(bakerValidator) === 3
                        ? bakerValidator
                        : null;
                    break;
                  case "currentCandidate":
                    const currentCandidate = contract[contractKey];
                    token.currentCandidate =
                      validateAddress(currentCandidate) === 3
                        ? currentCandidate
                        : null;
                    break;
                  case "currentDelegated":
                    const currentDelegated = contract[contractKey];
                    token.currentDelegated =
                      validateAddress(currentDelegated) === 3
                        ? currentDelegated
                        : null;
                    break;
                  case "lastUpdateTime":
                    const lastUpdateTime = contract[contractKey];
                    token.lastUpdateTime = this.is_timestamp(lastUpdateTime)
                      ? lastUpdateTime
                      : null;
                    break;
                  case "lastVeto":
                    const lastVeto = contract[contractKey];
                    token.lastVeto = this.is_timestamp(lastVeto)
                      ? lastVeto
                      : null;
                    break;
                  case "periodFinish":
                    const periodFinish = contract[contractKey];
                    token.periodFinish = this.is_timestamp(periodFinish)
                      ? periodFinish
                      : null;
                    break;
                  case "reward":
                    const reward = contract[contractKey];
                    token.reward = this.is_number(reward) ? reward : null;
                    break;
                  case "rewardPaid":
                    const rewardPaid = contract[contractKey];
                    token.rewardPaid = this.is_number(rewardPaid)
                      ? rewardPaid
                      : null;
                    break;
                  case "rewardPerSec":
                    const rewardPerSec = contract[contractKey];
                    token.rewardPerSec = this.is_number(rewardPerSec)
                      ? rewardPerSec
                      : null;
                    break;
                  case "totalReward":
                    const totalReward = contract[contractKey];
                    token.totalReward = this.is_number(totalReward)
                      ? totalReward
                      : null;
                    break;
                  case "totalSupply":
                    const totalSupply = contract[contractKey];
                    token.totalSupply = this.is_number(totalSupply)
                      ? totalSupply
                      : null;
                    break;
                  case "qptTokenSupply":
                    const qptTokenSupply = contract[contractKey];
                    token.qptTokenSupply = this.is_number(qptTokenSupply)
                      ? qptTokenSupply
                      : null;
                    break;
                  case "totalVotes":
                    const totalVotes = contract[contractKey];
                    token.totalVotes = this.is_number(totalVotes)
                      ? totalVotes
                      : null;
                    break;
                  case "usdValue":
                    const usdValue = contract[contractKey];
                    token.usdValue = this.is_number(usdValue) ? usdValue : null;
                    break;
                  case "pairs":
                    const pairs = contract[contractKey];
                    const tokenPairs = [];
                    pairs.forEach(pair => {
                      let tokenPair: TokenPair = {
                        address:
                          validateContractAddress(pair.address) === 3
                            ? pair.address
                            : null,
                        dex: this.is_string(pair.dex) ? pair.dex : null,
                        symbols: this.is_string(pair.symbols)
                          ? pair.symbols
                          : null,
                        tvl: this.is_number(pair.tvl) ? pair.tvl : null,
                        lptSupply: this.is_number(pair.lptSupply)
                          ? pair.tvl
                          : null,
                        sides: Array.isArray(pair.sides)
                          ? [
                              pair.sides.map(side => {
                                let tokenPairSide: TokenPairSide = {
                                  symbol: this.is_string(side.symbol)
                                    ? side.symbol
                                    : null,
                                  pool: this.is_number(side.pool)
                                    ? side.pool
                                    : null,
                                  price: this.is_number(side.price)
                                    ? side.price
                                    : null,
                                  usdvalue: this.is_number(side.usdvalue)
                                    ? side.usdvalue
                                    : null,
                                  dayClose: this.is_number(side.dayClose)
                                    ? side.dayClose
                                    : null,
                                  weekClose: this.is_number(side.weekClose)
                                    ? side.weekClose
                                    : null,
                                  monthClose: this.is_number(side.monthClose)
                                    ? side.monthClose
                                    : null,
                                  tokenType: this.is_string(side.tokenType)
                                    ? side.tokenType
                                    : null
                                };
                                return tokenPairSide;
                              })
                            ]
                          : null
                      };
                      tokenPairs.push(tokenPair);
                    });
                    token.pairs = tokenPairs;
                    break;
                  case "tags":
                    const tags = contract[contractKey];
                    token.tags = this.is_string(tags) ? tags : null;
                    break;
                  case "websiteLink":
                    const websiteLink = contract[contractKey];
                    token.websiteLink = {
                      url: websiteLink,
                      isValid: this.is_url(websiteLink)
                    };
                    break;
                  case "telegramLink":
                    const telegramLink = contract[contractKey];
                    token.telegramLink = {
                      url: telegramLink,
                      isValid: this.is_url(telegramLink)
                    };
                    break;
                  case "twitterLink":
                    const twitterLink = contract[contractKey];
                    token.twitterLink = {
                      url: twitterLink,
                      isValid: this.is_url(twitterLink)
                    };
                    break;
                  case "discordLink":
                    const discordLink = contract[contractKey];
                    token.discordLink = {
                      url: discordLink,
                      isValid: this.is_url(discordLink)
                    };
                    break;
                  case "thumbnailUri":
                    const thumbnailUri = contract[contractKey];
                    token.thumbnailUri = {
                      url: thumbnailUri,
                      isValid: this.is_url(thumbnailUri)
                    };
                    break;
                  case "timestamp":
                    const timestamp = contract[contractKey];
                    token.timestamp = this.is_timestamp(timestamp)
                      ? timestamp
                      : null;
                    break;
                  case "block":
                    const block = contract[contractKey];
                    token.block = this.is_string(block) ? block : null;
                    break;
                }
              });
              this.tokensPrices.push(token);
            });
            this.tokenTags = Array.from(
              new Set(this.tokensPrices.map(tk => tk.tags).filter(tk => tk))
            );
          }
        } else {
          throw "No response from the tokens prices API";
        }
      } catch (error) {
        console.error();
      }
    }
    if (xtzPrice) {
      // fetches XTZ price
      try {
        const response = await fetch(this.xtzPriceUrl);
        if (response) {
          const data = await response.json();
          // empty object for data
          let xtzPrice: xtzPrice = {
            fullData: true,
            price: null,
            price24h: null,
            marketCap: null,
            market24h: null,
            volume: null,
            volume24h: null,
            updated: null
          };
          // checks the data has the right shape
          const expectedKeys = Object.keys(xtzPrice);
          const receivedKeys = Object.keys(data);
          const matchingKeys = receivedKeys
            .map(key => expectedKeys.includes(key))
            .reduce((a, b) => a && b);
          if (!matchingKeys || expectedKeys.length === receivedKeys.length) {
            xtzPrice.fullData = false;
          }
          // copies received data into xtzPrice object
          Object.keys(xtzPrice).forEach(key => {
            if (data.hasOwnProperty(key)) {
              // checks data type
              if (key === "updated" && this.is_timestamp(data[key])) {
                xtzPrice.updated = data.updated;
              } else if (this.is_number(data[key])) {
                xtzPrice[key] = +data[key];
              }
            }
          });
          this.xtzPrice = xtzPrice;
          // user can set custom fiat
          if (defaultFiat !== "USD" && fiatExchangeRate) {
            this.defaultFiat = "EUR";
            this.xtzExchangeRate = fiatExchangeRate;
          } else {
            this.xtzExchangeRate = xtzPrice.price;
          }
        } else {
          throw "No response from the XTZ price API";
        }
      } catch (error) {
        console.error(error);
      }
    }

    return this;
  }

  /**
   * Allows users to set their own currency and exchange rate instead of the USD
   * @param {string} symbol the symbol of the currency
   * @param exchangeRate the exchange rate of the currency for 1 XTZ
   * @returns an instance of the class
   */
  updateInternalFiat(symbol: string, exchangeRate: number): TezToolsPrices {
    this.defaultFiat = symbol;
    this.xtzExchangeRate = exchangeRate;

    return this;
  }

  /**
   * Gets data about a single token
   * @param {string} tokenSymbol the token symbol to return
   * @returns {TokenPrice|null} the token data if found, otherwise null
   */
  get(tokenSymbol: string): TokenPrice | null {
    if (!this.tokensList.includes(tokenSymbol)) {
      return null;
    } else {
      return this.tokensPrices.find(tk => tk.symbol === tokenSymbol);
    }
  }

  // alias for get
  getBySymbol(tokenSymbol: string): TokenPrice | null {
    return this.get(tokenSymbol);
  }

  /**
   * Gets token data by type
   * @param {tokenType} type the token type to find
   * @returns {Array<TokenPrice>} the tokens found with the matching type
   */
  getByType(type: tokenType): Array<TokenPrice> {
    return this.tokensPrices.filter(tk => tk.type === type);
  }

  /**
   *
   * @param {TezosContractAddress} address the address of the contract to find
   * @returns the token found with the matching address
   */
  getByAddress(address: TezosContractAddress): TokenPrice {
    return this.tokensPrices.find(tk => tk.tokenAddress.address === address);
  }

  /**
   *
   * @param {string} tag the tag to find
   * @param {boolean} precision if set to true, must find the exact tag
   * @returns an array of TokenPrice
   */
  getByTag(tag: string, precision?: boolean): Array<TokenPrice> {
    if (precision) {
      return this.tokensPrices.filter(
        tk => tk.tags && tk.tags === tag.toLowerCase()
      );
    } else {
      return this.tokensPrices.filter(
        tk => tk.tags && tk.tags.toLowerCase().includes(tag.toLowerCase())
      );
    }
  }

  /**
   * Gets a list of token data
   * @returns a list of available tokens
   */
  getTokensList(): Array<string> {
    return this.tokensList.sort((a, b) => (a > b ? 1 : -1));
  }

  /**
   * Gets a list of tokens whose price is greater than the provided price
   * @param {number} price a price in tez
   * @returns a list of TokenPrice with a price greater than the parameter
   */
  getTokensWithPriceGreaterThan(price: number): Array<TokenPrice> {
    return this.tokensPrices
      .filter(tk => tk.currentPrice > price)
      .sort((a, b) => a.currentPrice - b.currentPrice);
  }

  /**
   * Gets a list of tokens whose price is less than the provided price
   * @param {number} price a price in tez
   * @returns a list of TokenPrice with a price less than the parameter
   */
  getTokensWithPriceLessThan(price: number): Array<TokenPrice> {
    return this.tokensPrices
      .filter(tk => tk.currentPrice < price)
      .sort((a, b) => a.currentPrice - b.currentPrice);
  }

  /**
   * Gets a list of token data ordered by USD value
   * @param {Array<string>} [tokens] An array of token symbols to return
   * @returns a list of TokenPrice order bu their USD value
   */
  orderByUsdValue(
    dir: "asc" | "desc",
    tokens?: Array<string>
  ): Array<TokenPrice> {
    const sortedTokens = this.tokensPrices.sort((a, b) =>
      dir === "desc" ? b.usdValue - a.usdValue : a.usdValue - b.usdValue
    );
    if (tokens) {
      return sortedTokens.filter(tk => tokens.includes(tk.symbol));
    } else {
      return sortedTokens;
    }
  }
  // alias for this.orderByUsdValue("desc")
  orderByUsdValueDesc(tokens?: Array<string>): Array<TokenPrice> {
    return this.orderByUsdValue("desc", tokens);
  }
  // alias for this.orderByUsdValue("asc")
  orderByUsdValueAsc(tokens?: Array<string>): Array<TokenPrice> {
    return this.orderByUsdValue("asc", tokens);
  }

  /**
   * Gets a list of tokens with their symbol and price
   * @param {Array<string>} [tokens] An optional array of token symbols to filter the results
   * @returns {Array<{symbol: string; xtzPrice: string; usdPrice: string}>} An array of objects with current price in XTZ and USD
   */
  getCurrentPrice(tokens?: Array<string>): Array<{
    symbol: string;
    xtzPrice: number;
    fiatPrice: number;
    fiat: string;
  }> {
    const tokensCurrentPrices = this.tokensPrices.map(tk => ({
      symbol: tk.symbol,
      xtzPrice: tk.currentPrice,
      fiatPrice: tk.currentPrice * this.xtzExchangeRate,
      fiat: this.defaultFiat
    }));
    if (tokens && tokens.length > 0) {
      return tokensCurrentPrices.filter(tk => tokens.includes(tk.symbol));
    } else {
      return tokensCurrentPrices;
    }
  }
}
