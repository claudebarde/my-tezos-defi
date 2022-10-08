import BigNumber from "bignumber.js";

const creditSubsidy = (xtzPool: BigNumber | number): BigNumber => {
  if (BigNumber.isBigNumber(xtzPool)) {
    return xtzPool.plus(new BigNumber(2500000));
  } else {
    return new BigNumber(xtzPool).plus(new BigNumber(2500000));
  }
};

export const xtzToTokenTokenOutput = (p: {
  xtzIn: BigNumber | number;
  xtzPool: BigNumber | number;
  tokenPool: BigNumber | number;
}): BigNumber | null => {
  let { xtzIn, xtzPool: _xtzPool, tokenPool } = p;
  let xtzPool = creditSubsidy(_xtzPool);
  let xtzIn_ = new BigNumber(0);
  let xtzPool_ = new BigNumber(0);
  let tokenPool_ = new BigNumber(0);
  try {
    xtzIn_ = new BigNumber(xtzIn);
    xtzPool_ = new BigNumber(xtzPool);
    tokenPool_ = new BigNumber(tokenPool);
  } catch (err) {
    return null;
  }
  if (
    xtzIn_.isGreaterThan(0) &&
    xtzPool_.isGreaterThan(0) &&
    tokenPool_.isGreaterThan(0)
  ) {
    // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
    // (xtzIn_ * tokenPool_ * 999 * 999) / (tokenPool * 1000 - tokenOut * 999 * 999)
    const numerator = xtzIn_.times(tokenPool_).times(new BigNumber(998001));
    const denominator = xtzPool_
      .times(new BigNumber(1000000))
      .plus(xtzIn_.times(new BigNumber(998001)));
    return numerator.dividedBy(denominator);
  } else {
    return null;
  }
};

export const tokenToXtzXtzOutput = (p: {
  tokenIn: BigNumber | number;
  xtzPool: BigNumber | number;
  tokenPool: BigNumber | number;
}): BigNumber | null => {
  const { tokenIn, xtzPool: _xtzPool, tokenPool } = p;
  let xtzPool = creditSubsidy(_xtzPool);
  let tokenIn_ = new BigNumber(0);
  let xtzPool_ = new BigNumber(0);
  let tokenPool_ = new BigNumber(0);
  try {
    tokenIn_ = new BigNumber(tokenIn);
    xtzPool_ = new BigNumber(xtzPool);
    tokenPool_ = new BigNumber(tokenPool);
  } catch (err) {
    return null;
  }
  if (
    tokenIn_.isGreaterThan(0) &&
    xtzPool_.isGreaterThan(0) &&
    tokenPool_.isGreaterThan(0)
  ) {
    // Includes 0.1% fee and 0.1% burn calculated separatedly: 999/1000 * 999/1000 = 998100/1000000
    let numerator = new BigNumber(tokenIn)
      .times(new BigNumber(xtzPool))
      .times(new BigNumber(998001));
    let denominator = new BigNumber(tokenPool)
      .times(new BigNumber(1000000))
      .plus(new BigNumber(tokenIn).times(new BigNumber(999000)));
    return numerator.dividedBy(denominator);
  } else {
    return null;
  }
};

export const removeLiquidityXtzTzbtcOut = (p: {
  liquidityBurned: number;
  totalLiquidity: number;
  xtzPool: number;
  tzbtcPool: number;
}): { xtzOut: BigNumber; tzbtcOut: BigNumber } | null => {
  const { liquidityBurned, totalLiquidity, xtzPool: _xtzPool, tzbtcPool } = p;

  let xtzPool = creditSubsidy(_xtzPool);
  let liquidityBurned_ = new BigNumber(0);
  let totalLiquidity_ = new BigNumber(0);
  let xtzPool_ = new BigNumber(0);
  let tzbtcPool_ = new BigNumber(0);
  try {
    liquidityBurned_ = new BigNumber(liquidityBurned);
    totalLiquidity_ = new BigNumber(totalLiquidity);
    xtzPool_ = new BigNumber(xtzPool);
    tzbtcPool_ = new BigNumber(tzbtcPool);
  } catch (err) {
    return null;
  }
  if (
    liquidityBurned_.isGreaterThan(0) &&
    totalLiquidity_.isGreaterThan(0) &&
    xtzPool_.isGreaterThan(0) &&
    tzbtcPool_.isGreaterThan(0)
  ) {
    // xtzPool_ * liquidityBurned_ / totalLiquidity_
    return {
      xtzOut: xtzPool_.times(liquidityBurned_).dividedBy(totalLiquidity_),
      tzbtcOut: tzbtcPool_.times(liquidityBurned_).dividedBy(totalLiquidity_)
    };
  } else {
    return null;
  }
};
