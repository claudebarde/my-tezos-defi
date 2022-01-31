import BigNumber from "bignumber.js";
import type { TezosToolkit } from "@taquito/taquito";
import { validateContractAddress } from "@taquito/utils";

type numericInput = BigNumber | number | string;

class LiquidityBaking {
  private Tezos: TezosToolkit;
  lbAddress: string;
  storage: any;
  xtzPool: BigNumber;
  tokenPool: BigNumber;
  lqtPool: BigNumber;
  private taquitoApi: "contract" | "wallet";

  constructor(
    lbAddress: string,
    Tezos: TezosToolkit,
    taquitoApi: "contract" | "wallet"
  ) {
    if (validateContractAddress(lbAddress) === 3) {
      this.Tezos = Tezos;
      this.lbAddress = lbAddress;
      this.xtzPool = new BigNumber(0);
      this.tokenPool = new BigNumber(0);
      this.lqtPool = new BigNumber(0);
      this.taquitoApi = taquitoApi;
    } else {
      throw "Invalid liquidity baking contract address";
    }
  }
  /**
   * Many functions use {(BigNumber|number|string)} as parameter. These parameters
   * are converted into BigNumber from the bignumber.js package and are expected to
   * to be non-negative numbers. string should be a string encoded integer. If you
   * are interfacing this project from another programming language, you should
   * pass the value for the parameter in {(BigNumber|number|string)} as a string to
   * avoid number size restrictions in JavaScript.
   */

  /**
   * =============================================================================
   * Internal utility functions
   * =============================================================================
   */

  /**
   * Test if a BigNumber is greater than zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x > 0
   */
  private gtZero(x: BigNumber): boolean {
    return x.isGreaterThan(0);
  }

  /**
   * Test if a BigNumber is greater than or equal to zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x >= 0
   */
  private geqZero(x: BigNumber): boolean {
    return x.isGreaterThanOrEqualTo(0);
  }

  /**
   * Test if a BigNumber is equal to zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x == 0
   */
  private eqZero(x: BigNumber): boolean {
    return x.isEqualTo(0);
  }

  /**
   * Test if a BigNumber is less than or equal to zero.
   *
   * @param {BigNumber} x
   * @returns {boolean} x <= 0
   */
  private leqZero(x: BigNumber): boolean {
    return x.isLessThanOrEqualTo(0);
  }

  /**
   * Ceiling division. If the remainder is greater than zero, increment by one.
   *
   * @param {BigNumber} x
   * @param {BigNumber} y
   * // ERROR: this doesn't return a boolean
   * @returns {boolean} if rem(x,y) > 0 then (x/y+1) else (x/y)
   */
  private ceilingDiv(x: BigNumber, y: BigNumber): BigNumber {
    var remainder = x.modulo(y);
    if (remainder.comparedTo(new BigNumber(1)) >= 0) {
      return x.dividedBy(y).plus(new BigNumber(1));
    }
    return x.dividedBy(y);
  }

  /**
   * Updates xtzPool with the 2.5 tez subsidy. Since this is applied before all other operations it can be assumed to have been applied at least once for any call to the CPMM.
   *
   * @param {BigNumber} xtzPool
   * @returns {BigNumber} xtzPool + 2_500_000
   */
  private creditSubsidy(xtzPool: numericInput): BigNumber {
    if (BigNumber.isBigNumber(xtzPool)) {
      return xtzPool.plus(new BigNumber(2500000));
    } else {
      return new BigNumber(xtzPool).plus(new BigNumber(2500000));
    }
  }

  /**
   * Gets the current storage of the liquidity baking contract
   *
   * @param undefined
   * @returns {LiquidityBaking} The current instance of the LiquidityBaking class.
   */

  async setup() {
    if (!this.lbAddress) {
      throw "This instance of LiquidityBaking does not include a contract address";
    } else if (!this.Tezos) {
      throw "This instance of LiquidityBaking does not include a TezosToolkit instance";
    } else {
      let contract;
      if (this.taquitoApi === "contract") {
        contract = await this.Tezos.contract.at(this.lbAddress);
      } else {
        contract = await this.Tezos.wallet.at(this.lbAddress);
      }
      const storage = await contract.storage();
      const { xtzPool, tokenPool, lqtPool } = storage;
      this.xtzPool = xtzPool;
      this.tokenPool = tokenPool;
      this.lqtPool = lqtPool;

      return this;
    }
  }

  /**
   * =============================================================================
   * xtzToToken entrypoint functions
   * =============================================================================
   */

  /**
   * Calculate the amount of token sold for a given XTZ input and Dexter's two pool
   * values for the dexter xtzToToken entrypoint.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(BigNumber|null)} The amount of token that Dexter will send to the :to address in the dexter xtzToToken entrypoint.
   */

  xtzToTokenTokenOutput(p: {
    xtzIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    let { xtzIn, xtzPool: _xtzPool, tokenPool } = p;

    let xtzPool = this.creditSubsidy(_xtzPool);
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
      var numerator = xtzIn_.times(tokenPool_).times(new BigNumber(998001));
      var denominator = xtzPool_
        .times(new BigNumber(1000000))
        .plus(xtzIn_.times(new BigNumber(998001)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  }

  /**
   * Calculate the amount of XTZ you must pay in in order to receive a target
   * amount of token for a given in the two Dexter pools. tokenOut is considered the
   * maximum amount a user may receive. The user may receive less because of slippage.
   *
   * @param {(BigNumber|number|string)} tokenOut - The amount of token that a user wants to receive. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(BigNumber|null)} The amount of XTZ the user must send to xtzToToken to get the tokenOut amount.
   */
  xtzToTokenXtzInput(p: {
    tokenOut: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    let { tokenOut, xtzPool: _xtzPool, tokenPool } = p;

    var decimals = 8;
    var xtzPool = this.creditSubsidy(_xtzPool);

    var tokenOut_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    var decimals_ = new BigNumber(0);
    try {
      tokenOut_ = new BigNumber(tokenOut);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }

    if (
      this.gtZero(tokenOut_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      // (xtzPool_ * tokenOut_ * 1000 * 1000 * 10 ** decimals) / (tokenPool - tokenOut * 999 * 999 * 10 ** decimals))
      var result = xtzPool_
        .times(tokenOut_)
        .times(new BigNumber(1000000))
        .times(Math.pow(10, decimals))
        .dividedBy(
          tokenPool_
            .minus(tokenOut_)
            .times(new BigNumber(998001).times(Math.pow(10, decimals)))
        );

      if (this.gtZero(result)) {
        return result;
      }
      return null;
    } else {
      return null;
    }
  }

  /**
   * Calculate the exchange rate for an XTZ to Token trade including the 0.1% fee given
   * to the liquidity providers and the penalty for trade size.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  xtzToTokenExchangeRate(p: {
    xtzIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { xtzIn, xtzPool, tokenPool } = p;
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      return this.xtzToTokenTokenOutput({
        xtzIn: xtzIn_,
        xtzPool: xtzPool_,
        tokenPool: tokenPool_
      }).dividedBy(xtzIn_);
    } else {
      return null;
    }
  }

  /**
   * Same as xtzToTokenExchangeRate but adjusted for the decimal places.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  xtzToTokenExchangeRateForDisplay(p: {
    xtzIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { xtzIn, xtzPool, tokenPool } = p;
    var decimals = 8;

    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      return this.xtzToTokenTokenOutput({
        xtzIn: xtzIn_,
        xtzPool: xtzPool_,
        tokenPool: tokenPool_
      })
        .times(Math.pow(10, -decimals))
        .dividedBy(xtzIn_.times(Math.pow(10, -6)));
    } else {
      return null;
    }
  }

  /**
   * Calculate the xtzToToken market rate for a give Dexter contract. The market
   * rate is an ideal number that doesn't include fees or penalties. In practice,
   * this rate  cannot be executed. This is used for displaying an exchange rate
   * without the trade size penalty (before a user enters an amount for display).
   *
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(number|null)} The market rate as a float value.
   */
  xtzToTokenMarketRate(p: {
    xtzPool: numericInput;
    tokenPool: numericInput;
    decimals: numericInput;
  }): BigNumber | null {
    const { xtzPool, tokenPool, decimals } = p;

    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    var decimals_ = new BigNumber(0);
    try {
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
      decimals_ = new BigNumber(decimals);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      xtzPool_ = xtzPool_.times(Math.pow(10, -6));
      tokenPool_ = tokenPool_.times(Math.pow(10, -decimals_));
      return tokenPool_.dividedBy(xtzPool_);
    } else {
      return null;
    }
  }

  /**
   * Calculate the xtzToToken price impact for a given Dexter contract. Price
   * impact is a measure of how much a trade will alter the future price.
   *
   * @param {(BigNumber|number|string)} xtzIn - The amount of XTZ the sender will sell to Dexter in xtzToToken.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} - The price impact percentage as a float value.
   */
  xtzToTokenPriceImpact(p: {
    xtzIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { xtzIn, xtzPool: _xtzPool, tokenPool } = p;
    var xtzPool = this.creditSubsidy(_xtzPool);
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      var midPrice = tokenPool_.dividedBy(xtzPool_);
      var xtzInNetBurn = xtzIn_.times(999).dividedBy(1000);
      var tokensBought = xtzInNetBurn
        .times(tokenPool_)
        .dividedBy(xtzInNetBurn.plus(xtzPool_));
      // if no tokens have been purchased then there is no price impact
      if (this.leqZero(tokensBought)) {
        return new BigNumber(0);
      }
      var exactQuote = midPrice.times(xtzIn_);
      return exactQuote.minus(tokensBought).dividedBy(exactQuote);
    } else {
      return null;
    }
  }

  /**
   * Calculate the minimum token out to be sent to Dexter for a given max tokenOut
   * and the max allowed slippage rate the user accepts. If the exchange rate
   * has lowered less than the user's allowed slippage at the time of execution,
   * then the trade will fail.
   *
   * @param {(BigNumber|number|string)} tokenOut - Token out as calculated by xtzToTokenTokenOut. Must be greater than zero.
   * @param {number} allowedSlippage - Maximum slippage rate that a user will except for an exchange. Must be between 0.00 and 1.00.
   * @returns {(BigNumber|null)} The minimum token amount to send to the xtzToToken entrypoint.
   */
  xtzToTokenMinimumTokenOutput(p: {
    tokenOut: numericInput;
    allowedSlippage: numericInput;
  }): BigNumber | null {
    const { tokenOut: _tokenOut, allowedSlippage: _allowedSlippage } = p;
    let tokenOut = new BigNumber(0);
    let allowedSlippage = new BigNumber(0);
    if (!BigNumber.isBigNumber(_tokenOut)) {
      tokenOut = new BigNumber(_tokenOut);
    }
    if (!BigNumber.isBigNumber(_allowedSlippage)) {
      allowedSlippage = new BigNumber(_allowedSlippage);
    }

    if (
      tokenOut.isGreaterThan(0) &&
      allowedSlippage.isGreaterThanOrEqualTo(0) &&
      allowedSlippage.isLessThanOrEqualTo(1)
    ) {
      // ((tokenOut * 1000) - ((tokenOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
      var tokenOut_ = tokenOut.times(new BigNumber(1000));
      var allowedSlippage_ = new BigNumber(
        Math.floor(allowedSlippage.times(1000).times(100).toNumber())
      );
      var result = tokenOut_
        .minus(
          tokenOut_.times(allowedSlippage_).dividedBy(new BigNumber(100000))
        )
        .dividedBy(1000);
      if (result.isGreaterThan(new BigNumber(1))) {
        return result;
      } else {
        return new BigNumber(1);
      }
    } else {
      return null;
    }
  }

  /**
   * Calculate the fee that liquidity providers, as a whole and not individually,
   * will receive for a given amount of XTZ sold to a dexter contract.
   *
   * @param {(BigNumber|number|string)} xtzIn The amount of XTZ sold to dexter. Must be greater than zero.
   * @returns {(number|null)} The fee paid to the dexter liquidity providers.
   */
  totalLiquidityProviderFee(xtzIn: numericInput): BigNumber | null {
    var xtzIn_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
    } catch (err) {
      return null;
    }
    if (this.gtZero(xtzIn_)) {
      return xtzIn_.times(new BigNumber(1)).dividedBy(1000);
    } else {
      return null;
    }
  }

  /**
   * Calculate the fee that a single liquidity provider will receive for a given amount of
   * XTZ sold to a dexter contract.
   *
   * @param {(BigNumber|number|string)} xtzIn - The amount of XTZ sold to dexter. Must be greater than zero.
   * @returns {(number|null)} The fee paid to an individual dexter liquidity provider.
   */
  liquidityProviderFee(p: {
    xtzIn: numericInput;
    totalLiquidity: numericInput;
    userLiquidity: numericInput;
  }): BigNumber | null {
    const { xtzIn, totalLiquidity, userLiquidity } = p;
    var xtzIn_ = new BigNumber(0);
    var totalLiquidity_ = new BigNumber(0);
    var userLiquidity_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      totalLiquidity_ = new BigNumber(totalLiquidity);
      userLiquidity_ = new BigNumber(userLiquidity);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(totalLiquidity_) &&
      this.gtZero(userLiquidity_)
    ) {
      return this.totalLiquidityProviderFee(xtzIn).dividedBy(
        totalLiquidity_.dividedBy(userLiquidity)
      );
    } else {
      return null;
    }
  }

  /**
   * =============================================================================
   * tokenToXtz entrypoint functions
   * =============================================================================
   */

  /**
   * Get the amount of XTZ sold for a given token input and the pool state of Dexter
   * for the Dexter tokenToXtz entrypoint.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(BigNumber|null)} The amount of XTZ that Dexter will send to the :to
   * address in the dexter tokenToXtz entrypoint.
   */
  tokenToXtzXtzOutput(p: {
    tokenIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
    var xtzPool = this.creditSubsidy(_xtzPool);
    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      var numerator = new BigNumber(tokenIn)
        .times(new BigNumber(xtzPool))
        .times(new BigNumber(998001));
      var denominator = new BigNumber(tokenPool)
        .times(new BigNumber(1000000))
        .plus(new BigNumber(tokenIn).times(new BigNumber(999000)));
      return numerator.dividedBy(denominator);
    } else {
      return null;
    }
  }

  /**
   * Calculate the amount of token you must pay in in order to receive a target
   * amount of XTZ for a given Dexter pool state. xtzOut is considered the
   * maximum amount a user may receive. The user may receive less because of slippage.
   *
   * @param {(BigNumber|number|string)} xtzOut - The amount of token that a user wants to receive. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(BigNumber|null)} The amount of token the user must send to tokenToXtz to get the xtzOut amount.
   */
  tokenToXtzTokenInput(p: {
    xtzOut: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { xtzOut, xtzPool: _xtzPool, tokenPool } = p;
    var decimals = 8;
    var xtzPool = this.creditSubsidy(_xtzPool);

    var xtzOut_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    var decimals_ = new BigNumber(0);
    try {
      xtzOut_ = new BigNumber(xtzOut);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzOut_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(decimals_)
    ) {
      // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
      // (tokenPool_ * xtzOut_ * 1000 * 1000 * 10 ** decimals) / ((xtzPool * 999 * 1000 - xtzOut * 999 * 999) * 10 ** decimals))
      var result = tokenPool_
        .times(xtzOut_)
        .times(new BigNumber(1000000))
        .times(Math.pow(10, decimals))
        .dividedBy(
          xtzPool_
            .times(new BigNumber(999000))
            .minus(xtzOut_.times(new BigNumber(998001)))
            .times(Math.pow(10, decimals))
        );

      if (this.gtZero(result)) {
        return result;
      }
      return null;
    } else {
      return null;
    }
  }

  /**
   * Calculate the exchange rate for a token to XTZ trade including the 0.1% fee given
   * to the liquidity providers and the penalty for large trades.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  tokenToXtzExchangeRate(p: {
    tokenIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { tokenIn, xtzPool, tokenPool } = p;
    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      return this.tokenToXtzXtzOutput({
        tokenIn: tokenIn_,
        xtzPool: xtzPool_,
        tokenPool: tokenPool_
      }).dividedBy(tokenIn_);
    } else {
      return null;
    }
  }

  /**
   * Same as tokenToXtzExchangeRate but adjusted for the decimal places.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender sells to Dexter. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} The exchange rate as a float number.
   */
  tokenToXtzExchangeRateForDisplay(p: {
    tokenIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { tokenIn, xtzPool, tokenPool } = p;
    var decimals = 8;

    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      return this.tokenToXtzXtzOutput({
        tokenIn: tokenIn_,
        xtzPool: xtzPool_,
        tokenPool: tokenPool_
      })
        .times(Math.pow(10, -6))
        .dividedBy(tokenIn_.times(Math.pow(10, -decimals)));
    } else {
      return null;
    }
  }

  /**
   * Calculate the tokenToXtz market rate for a given Dexter contract. The market
   * rate is an ideal number that doesn't include fees or penalties. In practice,
   * this rate cannot be executed. This is used for displaying an exchange rate
   * without the trade size penalty (before a user enters an amount for display).
   *
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} decimals - The number of decimals a token has. Must be greater than or equal to zero.
   * @returns {(number|null)} The market rate as a float value.
   */
  tokenToXtzMarketRate(p: {
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { xtzPool, tokenPool } = p;
    var decimals = 8;
    let xtzPool_ = new BigNumber(0);
    let tokenPool_ = new BigNumber(0);
    try {
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_) &&
      this.geqZero(new BigNumber(decimals))
    ) {
      xtzPool_ = xtzPool_.times(Math.pow(10, -6));
      tokenPool_ = tokenPool_.times(Math.pow(10, -decimals));
      return xtzPool_.dividedBy(tokenPool_);
    } else {
      return null;
    }
  }

  /**
   * Calculate the tokenToXtz price impact for a give Dexter contract. Price
   * impact is a measure of how much a trade will alter the future price.
   *
   * @param {(BigNumber|number|string)} tokenIn - The amount of Token the sender will sell to Dexter in tokenToXtz.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(number|null)} - The price impact percentage as a float value.
   */
  tokenToXtzPriceImpact(p: {
    tokenIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
    var xtzPool = this.creditSubsidy(_xtzPool);
    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      var midPrice = xtzPool_.dividedBy(tokenPool_);
      var xtzBought = tokenIn_
        .times(xtzPool_)
        .dividedBy(tokenIn_.plus(tokenPool_));
      var xtzBoughtNetBurn = xtzBought
        .times(new BigNumber(999))
        .dividedBy(new BigNumber(1000));
      // if no tokens have been purchased then there is no price impact
      if (this.leqZero(xtzBoughtNetBurn)) {
        return new BigNumber(0);
      }
      var exactQuote = midPrice.times(tokenIn_);
      return exactQuote.minus(xtzBoughtNetBurn).dividedBy(exactQuote);
    } else {
      return null;
    }
  }

  /**
   * Calculate the minimum token out to be sent to dexter for a given max xtzOut
   * and the max allowed slippage rate the user accepts.  If the exchange rate
   * has lowered less than the user's allowed slippage at the time of execution,
   * then the trade will fail.
   *
   * @param {(BigNumber|number|string)} xtzOut - XTZ out as calculated by tokenToXtzTokenOut. Must be greater than zero.
   * @param {number} allowedSlippage - Maximum slippage rate that a user will except for an exchange. Must be between 0.00 and 1.00.
   * @returns {(BigNumber|null)} The minimum token amount to send to the tokenToXtz entrypoint.
   */
  tokenToXtzMinimumXtzOutput(p: {
    xtzOut: numericInput;
    allowedSlippage: numericInput;
  }) {
    const { xtzOut: _xtzOut, allowedSlippage: _allowedSlippage } = p;
    let xtzOut = new BigNumber(0);
    let allowedSlippage = new BigNumber(0);
    if (!BigNumber.isBigNumber(_xtzOut)) {
      xtzOut = new BigNumber(_xtzOut);
    }
    if (!BigNumber.isBigNumber(_allowedSlippage)) {
      allowedSlippage = new BigNumber(_allowedSlippage);
    }
    if (
      xtzOut.isGreaterThan(0) &&
      allowedSlippage.isGreaterThanOrEqualTo(0) &&
      allowedSlippage.isLessThanOrEqualTo(1)
    ) {
      // ((xtzOut * 1000) - ((xtzOut * 1000) * (allowedSlippage * 100000) / 100000)) / 1000
      var xtzOut_ = new BigNumber(xtzOut).times(new BigNumber(1000));
      var allowedSlippage_ = new BigNumber(
        Math.floor(allowedSlippage.times(1000).times(100).toNumber())
      );
      var result = xtzOut_
        .minus(xtzOut_.times(allowedSlippage_).dividedBy(new BigNumber(100000)))
        .dividedBy(1000);
      if (result.isGreaterThan(new BigNumber(1))) {
        return result;
      } else {
        return new BigNumber(1);
      }
    } else {
      return null;
    }
  }

  /**
   * =============================================================================
   * addLiquidity entrypoint functions
   * =============================================================================
   */

  /**
   * Get the amount of liquidity created and rewarded given an XTZ input,
   * the current liquidity in Dexter and the amount of XTZ held by Dexter.
   * Note that the token amount does not affect the liquidity.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender gives to Dexter for liquidity. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds.  Must be greater than zero.
   * @param {(BigNumber|number|string)} totalLiquidity - Total amount of liquidity in a Dexter pool. Must be greater than or equal to zero.
   * @returns {(BigNumber|null)} The amount of liquidity that the sender gains.
   */
  addLiquidityLiquidityCreated(p: {
    xtzIn: numericInput;
    xtzPool: numericInput;
    totalLiquidity: numericInput;
  }): BigNumber | null {
    const { xtzIn, xtzPool: _xtzPool, totalLiquidity } = p;

    var xtzPool = this.creditSubsidy(_xtzPool);
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var totalLiquidity_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      totalLiquidity_ = new BigNumber(totalLiquidity);
    } catch (err) {
      return null;
    }
    if (this.gtZero(xtzIn_) && this.gtZero(xtzPool_)) {
      if (this.eqZero(totalLiquidity_)) {
        return new BigNumber(xtzIn)
          .times(new BigNumber(totalLiquidity))
          .dividedBy(new BigNumber(xtzPool));
      } else if (this.gtZero(totalLiquidity_)) {
        return new BigNumber(xtzIn)
          .times(new BigNumber(totalLiquidity))
          .dividedBy(new BigNumber(xtzPool));
      }
      return null;
    } else {
      return null;
    }
  }

  /**
   * For a given amount of xtzIn and the state of the Dexter xtz pool and token
   * pool. Calculate the minimum amount of tokens the user would be required
   * to deposit. If totalLiquidity is zero then sender must deposit at least one
   * XTZ (1,000,000 mutez) and one token. The exchange rate is not set.
   *
   * @param {(BigNumber|number|string)} xtzIn - XTZ amount the sender gives to Dexter for liquidity. Must be greater than zero.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds. Must be greater than zero.
   * @param {(BigNumber|number|string)} tokenPool - Token amount that Dexter holds. Must be greater than zero.
   * @returns {(BigNumber|null)} The amount of liquidity that the sender gains.
   */
  addLiquidityTokenIn(p: {
    xtzIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { xtzIn, xtzPool: _xtzPool, tokenPool } = p;

    var xtzPool = this.creditSubsidy(_xtzPool);
    var xtzIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      xtzIn_ = new BigNumber(xtzIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(xtzIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // cdiv(xtzIn_ * tokenPool_, xtzPool_)
      return this.ceilingDiv(xtzIn_.times(tokenPool_), xtzPool_);
    } else {
      return null;
    }
  }

  /**
   * For a given amount of tokenIn and the state of the Dexter xtz pool and token
   * pool. Calculate the minimum amount of XTZ the user would be required
   * to deposit. If totalLiquidity is zero then sender must deposit at least one
   * XTZ (1,000,000 mutez) and one token. The exchange rate is not set.
   *
   * @param {(BigNumber|number|string)} tokenIn - Token amount the sender gives to Dexter for liquidity.
   * @param {(BigNumber|number|string)} xtzPool - XTZ amount that Dexter holds.
   * @param {(BigNumber|number|string)} tokenPool Token amount that Dexter holds.
   * @returns {{bigInt|null}} The amount of liquidity that the sender gains.
   */
  addLiquidityXtzIn(p: {
    tokenIn: numericInput;
    xtzPool: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;

    var xtzPool = this.creditSubsidy(_xtzPool);
    var tokenIn_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      tokenIn_ = new BigNumber(tokenIn);
      xtzPool_ = new BigNumber(xtzPool);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(tokenIn_) &&
      this.gtZero(xtzPool_) &&
      this.gtZero(tokenPool_)
    ) {
      // div(tokenIn_ * xtzPool_, tokenPool_)
      return tokenIn_.times(xtzPool_).dividedBy(tokenPool_);
    } else {
      return null;
    }
  }

  /**
   * =============================================================================
   * removeLiquidity entrypoint functions
   * =============================================================================
   */

  /**
   * Calculate the amount of token a sender would receive for burning a certain amount
   * of liquidity given a Dexter exchange that has a certain amount of
   * total liquidity and holds an amount of token.
   *
   * @param {(BigNumber|number|string)} liquidityBurned LQT that the sender burns.
   * @param {(BigNumber|number|string)} totalLiquidity The total amount of liquidity in a Dexter exchange.
   * @param {(BigNumber|number|string)} tokenPool amount of token that Dexter holds.
   * @returns {(BigNumber|null)} The amount of token that the sender gains.
   */
  removeLiquidityTokenOut(p: {
    liquidityBurned: numericInput;
    totalLiquidity: numericInput;
    tokenPool: numericInput;
  }): BigNumber | null {
    const { liquidityBurned, totalLiquidity, tokenPool } = p;

    var liquidityBurned_ = new BigNumber(0);
    var totalLiquidity_ = new BigNumber(0);
    var tokenPool_ = new BigNumber(0);
    try {
      liquidityBurned_ = new BigNumber(liquidityBurned);
      totalLiquidity_ = new BigNumber(totalLiquidity);
      tokenPool_ = new BigNumber(tokenPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(liquidityBurned_) &&
      this.gtZero(totalLiquidity_) &&
      this.gtZero(tokenPool_)
    ) {
      // tokenPool_ * liquidityBurned_ / totalLiquidity_
      return tokenPool_.times(liquidityBurned_).dividedBy(totalLiquidity_);
    } else {
      return null;
    }
  }

  /**
   * Calculate the amount of XTZ a sender would receive for burning a certain amount
   * of liquidity given a Dexter exchange that has a certain amount of
   * total liquidity and holds an amount of XTZ.
   *
   * @param {(BigNumber|number|string)} liquidityBurned LQT that the sender burns.
   * @param {(BigNumber|number|string)} totalLiquidity The total amount of liquidity in a Dexter exchange.
   * @param {(BigNumber|number|string)} xtzPool amount of token that Dexter holds.
   * @returns {(BigNumber|null)} The amount of XTZ that the sender gains.
   */
  removeLiquidityXtzOut(p: {
    liquidityBurned: numericInput;
    totalLiquidity: numericInput;
    xtzPool: numericInput;
  }): BigNumber | null {
    const { liquidityBurned, totalLiquidity, xtzPool: _xtzPool } = p;

    var xtzPool = this.creditSubsidy(_xtzPool);
    var liquidityBurned_ = new BigNumber(0);
    var totalLiquidity_ = new BigNumber(0);
    var xtzPool_ = new BigNumber(0);
    try {
      liquidityBurned_ = new BigNumber(liquidityBurned);
      totalLiquidity_ = new BigNumber(totalLiquidity);
      xtzPool_ = new BigNumber(xtzPool);
    } catch (err) {
      return null;
    }
    if (
      this.gtZero(liquidityBurned_) &&
      this.gtZero(totalLiquidity_) &&
      this.gtZero(xtzPool_)
    ) {
      // xtzPool_ * liquidityBurned_ / totalLiquidity_
      return xtzPool_.times(liquidityBurned_).dividedBy(totalLiquidity_);
    } else {
      return null;
    }
  }
}

export default LiquidityBaking;
