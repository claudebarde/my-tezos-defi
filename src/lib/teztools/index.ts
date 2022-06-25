type TezosContractAddress = `KT1${string}`;
type TezosAccountAddress = `tz${"1" | "2" | "3"}${string}`;
export enum tokenType {
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
  symbol: string | null;
  pool: number | null;
  price: number | null;
  usdvalue: number | null;
  dayClose: number | null;
  weekClose: number | null;
  monthClose: number | null;
  tokenType: string | null;
}

interface TokenPair {
  address: TezosContractAddress | null;
  dex: dexName | null;
  symbols: string | null;
  tvl: number | null;
  lptSupply: number | null;
  sides: Array<TokenPairSide> | null;
}

interface TokenData {
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

const validateAddress = (address: any): boolean => {
  if (typeof address !== "string") return false;

  address = address.trim();
  if (address.length === 0) return false;

  if (address.slice(0, 2) === "tz") {
    const regex = new RegExp("tz[123][1-9A-HJ-NP-Za-km-z]{33}");
    return regex.test(address);
  } else if (address.slice(0, 2) === "KT") {
    const regex = new RegExp("KT1[1-9A-HJ-NP-Za-km-z]{33}");
    return regex.test(address);
  } else {
    return false;
  }
};

export class TezToolsSDK {
  pricesApiUrl = "https://api.teztools.io/v1/prices";
  xtzPriceUrl = "https://api.teztools.io/v1/xtz-price";
  xtzPrice: xtzPrice | undefined = undefined;
  tokensPrices: Array<TokenData>;
  tokensList: Array<string>;
  defaultFiat = "USD";
  xtzExchangeRate: number | null | undefined = undefined;
  tokenTags: Array<string> = [];
  numberOfTokens = 0;
  fetch: any;

  constructor() {
    this.tokensPrices = [];
    this.tokensList = [];

    if (window) {
      // browser usage
      this.fetch = async (url: string) => {
        const res = await fetch(url);
        if (res) {
          return await res.json();
        } else {
          return null;
        }
      };
    } else {
      // no browser usage
      this.fetch = async (url: string) => {
        const axios = (await import("axios")).default;
        const res = await axios.get(url);
        if (res) {
          return res.data;
        } else {
          return null;
        }
      };
    }
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
  async init(p?: {
    prices?: boolean;
    xtzPrice?: boolean;
    defaultFiat?: string;
    fiatExchangeRate?: number;
  }): Promise<TezToolsSDK> {
    const prices = p && p.prices ? p.prices : true;
    const xtzPrice = p && p.xtzPrice ? p.xtzPrice : true;
    const defaultFiat = p && p.defaultFiat ? p.defaultFiat : "USD";
    const fiatExchangeRate =
      p && p.fiatExchangeRate ? p.fiatExchangeRate : undefined;
    if (prices) {
      // fetches tokens prices
      try {
        const data = await this.fetch(this.pricesApiUrl);
        if (data) {
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
            this.numberOfTokens = data.contracts.length;
            data.contracts.forEach((contract: TokenData) => {
              let token: TokenData = {
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
                // validates data
                switch (contractKey) {
                  case "symbol":
                    const symbol = contract[contractKey];
                    if (this.is_string(symbol)) {
                      this.tokensList.push(symbol as string);
                      token.symbol = symbol;
                    } else {
                      token.symbol = null;
                    }
                    break;
                  case "tokenAddress":
                    const tokenAddress: unknown = contract[contractKey];
                    token.tokenAddress = (() => {
                      if (
                        this.is_string(tokenAddress) &&
                        validateAddress(tokenAddress)
                      ) {
                        return {
                          address: tokenAddress as TezosContractAddress,
                          isValid: true
                        };
                      } else {
                        return null;
                      }
                    })();
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
                    const address: unknown = contract[contractKey];
                    token.address = (() => {
                      if (this.is_string(address) && validateAddress(address)) {
                        return {
                          address: address as TezosContractAddress,
                          isValid: true
                        };
                      } else {
                        return null;
                      }
                    })();
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
                    const bakerValidator: unknown = contract[contractKey];
                    token.bakerValidator = validateAddress(bakerValidator)
                      ? (bakerValidator as TezosContractAddress)
                      : null;
                    break;
                  case "currentCandidate":
                    const currentCandidate = contract[contractKey];
                    token.currentCandidate = validateAddress(currentCandidate)
                      ? currentCandidate
                      : null;
                    break;
                  case "currentDelegated":
                    const currentDelegated = contract[contractKey];
                    token.currentDelegated = validateAddress(currentDelegated)
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
                    const tokenPairs: Array<TokenPair> = [];
                    pairs.forEach(pair => {
                      let tokenPair: TokenPair = {
                        address: validateAddress(pair.address)
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
                              ...pair.sides.map(side => {
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
                    const websiteLink: unknown = contract[contractKey];
                    token.websiteLink = (() => {
                      if (this.is_string(websiteLink)) {
                        return {
                          url: websiteLink as string,
                          isValid: this.is_url(websiteLink)
                        };
                      } else {
                        return null;
                      }
                    })();
                    break;
                  case "telegramLink":
                    const telegramLink: unknown = contract[contractKey];
                    token.telegramLink = (() => {
                      if (this.is_string(telegramLink)) {
                        return {
                          url: telegramLink as string,
                          isValid: this.is_url(telegramLink)
                        };
                      } else {
                        return null;
                      }
                    })();
                    break;
                  case "twitterLink":
                    const twitterLink: unknown = contract[contractKey];
                    token.twitterLink = (() => {
                      if (this.is_string(twitterLink)) {
                        return {
                          url: twitterLink as string,
                          isValid: this.is_url(twitterLink)
                        };
                      } else {
                        return null;
                      }
                    })();
                    break;
                  case "discordLink":
                    const discordLink: unknown = contract[contractKey];
                    token.discordLink = (() => {
                      if (this.is_string(discordLink)) {
                        return {
                          url: discordLink as string,
                          isValid: this.is_url(discordLink)
                        };
                      } else {
                        return null;
                      }
                    })();
                    break;
                  case "thumbnailUri":
                    const thumbnailUri: unknown = contract[contractKey];
                    token.thumbnailUri = (() => {
                      if (this.is_string(thumbnailUri)) {
                        return {
                          url: thumbnailUri as string,
                          isValid: this.is_url(thumbnailUri)
                        };
                      } else {
                        return null;
                      }
                    })();
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
              new Set(
                this.tokensPrices.map(tk => tk.tags).filter(tk => tk !== null)
              )
            ) as Array<string>;
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
        const data = await this.fetch(this.xtzPriceUrl);
        if (data) {
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
                // HACK: find a proper way to type xtzPrice[key]
                (xtzPrice as any)[key] = +data[key];
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
   * This is just an alias for the "init" method to fetch new prices and data
   * @param {Object[prices: boolean; xtzPrice: boolean; defaultFiat: string; fiatExchangeRate: number]} params Option to choose data fetched by the instance
   * @return {Promise<TezToolsPrices>} A promise with an instance of the class
   */
  async refresh(p?: {
    prices?: boolean;
    xtzPrice?: boolean;
    defaultFiat?: string;
    fiatExchangeRate?: number;
  }): Promise<TezToolsSDK> {
    return await this.init(p);
  }

  /**
   * Allows users to set their own currency and exchange rate instead of the USD
   * @param {string} symbol the symbol of the currency
   * @param exchangeRate the exchange rate of the currency for 1 XTZ
   * @returns an instance of the class
   */
  updateInternalFiat(symbol: string, exchangeRate: number): TezToolsSDK {
    this.defaultFiat = symbol;
    this.xtzExchangeRate = exchangeRate;

    return this;
  }

  /**
   * Gets data about a single token
   * @param {string} tokenSymbol the token symbol to return
   * @returns {TokenData|null} the token data if found, otherwise null
   */
  get(tokenSymbol: string): TokenData | null {
    if (!this.tokensList.includes(tokenSymbol)) {
      return null;
    } else {
      const result = this.tokensPrices.find(tk => tk.symbol === tokenSymbol);
      if (result) {
        return result;
      } else {
        return null;
      }
    }
  }

  // alias for get
  getBySymbol(tokenSymbol: string): TokenData | null {
    return this.get(tokenSymbol);
  }

  /**
   * Gets token data by type
   * @param {tokenType} type the token type to find
   * @returns {Array<TokenData>} the tokens found with the matching type
   */
  getByType(type: tokenType): Array<TokenData> {
    return this.tokensPrices.filter(tk => tk.type === type);
  }

  /**
   *
   * @param {TezosContractAddress} address the address of the contract to find
   * @returns the token found with the matching address
   */
  getByAddress(address: TezosContractAddress): TokenData | null {
    const result = this.tokensPrices.find(tk =>
      tk.tokenAddress ? tk.tokenAddress.address === address : undefined
    );
    if (result) {
      return result;
    } else {
      return null;
    }
  }

  /**
   *
   * @param {string} tag the tag to find
   * @param {boolean} precision if set to true, must find the exact tag
   * @returns an array of TokenData
   */
  getByTag(tag: string, precision?: boolean): Array<TokenData> {
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
   * @returns a list of TokenData with a price greater than the parameter
   */
  getTokensWithPriceGreaterThan(price: number): Array<TokenData> {
    return this.tokensPrices
      .filter(tk => (tk.currentPrice ? tk.currentPrice > price : false))
      .sort((a, b) => {
        if (a.currentPrice && b.currentPrice) {
          return a.currentPrice - b.currentPrice;
        } else {
          return 0;
        }
      });
  }

  /**
   * Gets a list of tokens whose price is less than the provided price
   * @param {number} price a price in tez
   * @returns a list of TokenData with a price less than the parameter
   */
  getTokensWithPriceLessThan(price: number): Array<TokenData> {
    return this.tokensPrices
      .filter(tk => (tk.currentPrice ? tk.currentPrice < price : false))
      .sort((a, b) => {
        if (a.currentPrice && b.currentPrice) {
          return a.currentPrice - b.currentPrice;
        } else {
          return 0;
        }
      });
  }

  /**
   * Gets a list of token data ordered by USD value
   * @param {Array<string>} [tokens] An array of token symbols to return
   * @returns a list of TokenData order bu their USD value
   */
  private orderByUsdValue(
    dir: "asc" | "desc",
    tokens?: Array<string>
  ): Array<TokenData> {
    const sortedTokens = this.tokensPrices.sort((a, b) => {
      if (a.usdValue && b.usdValue) {
        return dir === "desc"
          ? b.usdValue - a.usdValue
          : a.usdValue - b.usdValue;
      } else {
        return 0;
      }
    });
    if (tokens) {
      // checks if all the tokens are available
      const unknownTokens = tokens.filter(tk => !this.tokensList.includes(tk));
      if (unknownTokens.length > 0) {
        throw { message: "Unknown token(s)", list: unknownTokens };
      }

      return sortedTokens.filter(tk =>
        tk.symbol ? tokens.includes(tk.symbol) : false
      );
    } else {
      return sortedTokens;
    }
  }
  // alias for this.orderByUsdValue("desc")
  orderByUsdValueDesc(tokens?: Array<string>): Array<TokenData> {
    return this.orderByUsdValue("desc", tokens);
  }
  // alias for this.orderByUsdValue("asc")
  orderByUsdValueAsc(tokens?: Array<string>): Array<TokenData> {
    return this.orderByUsdValue("asc", tokens);
  }

  /**
   * Gets a list of tokens with their symbol and price
   * @param {Array<string>} [tokens] An optional array of token symbols to filter the results
   * @returns {Array<{symbol: string; xtzPrice: string; usdPrice: string}>} An array of objects with current price in XTZ and USD
   */
  getCurrentPrice(tokens?: Array<string>): Array<{
    symbol: string | null;
    xtzPrice: number | null;
    fiatPrice: number | null;
    fiat: string | null;
  }> | null {
    const tokensCurrentPrices = this.tokensPrices.map(tk => ({
      symbol: tk.symbol,
      xtzPrice: tk.currentPrice,
      fiatPrice:
        tk.currentPrice && this.xtzExchangeRate
          ? tk.currentPrice * this.xtzExchangeRate
          : null,
      fiat: this.defaultFiat
    }));
    if (tokens && tokens.length > 0) {
      // checks if all the tokens are available
      const unknownTokens = tokens.filter(tk => !this.tokensList.includes(tk));
      if (unknownTokens.length > 0) {
        throw { message: "Unknown token(s)", list: unknownTokens };
      }

      return tokensCurrentPrices.filter(tk =>
        tk.symbol ? tokens.includes(tk.symbol) : false
      );
    } else {
      return tokensCurrentPrices;
    }
  }
}
