import BigNumber from "bignumber.js";

export const computeToken2Output = (
  token1Amount: BigNumber | number,
  token1Pool: BigNumber | number,
  token2Pool: BigNumber | number
): BigNumber | null => {
  let token1In_ = new BigNumber(0);
  var token1Pool_ = new BigNumber(0);
  var token2Pool_ = new BigNumber(0);
  try {
    token1In_ = new BigNumber(token1Amount);
    token1Pool_ = new BigNumber(token1Pool);
    token2Pool_ = new BigNumber(token2Pool);
  } catch (err) {
    return null;
  }
  if (
    token1In_.isGreaterThan(0) &&
    token1Pool_.isGreaterThan(0) &&
    token2Pool_.isGreaterThan(0)
  ) {
    var numerator = token1In_.times(token2Pool_);
    //.times(new BigNumber(998001));
    var denominator = token1Pool_.times(new BigNumber(1000000)).plus(token1In_);
    return numerator.dividedBy(denominator);
  } else {
    return null;
  }
};

export const computeLpTokenPrice = (
  liquidityBurned: BigNumber | number,
  totalLiquidity: BigNumber | number,
  token1Pool: BigNumber | number,
  token2Pool: BigNumber | number
): { token1Output: BigNumber; token2Output: BigNumber } | null => {
  let liquidityBurned_ = new BigNumber(0);
  let totalLiquidity_ = new BigNumber(0);
  let token1Pool_ = new BigNumber(0);
  let token2Pool_ = new BigNumber(0);
  try {
    liquidityBurned_ = new BigNumber(liquidityBurned);
    totalLiquidity_ = new BigNumber(totalLiquidity);
    token1Pool_ = new BigNumber(token1Pool);
    token2Pool_ = new BigNumber(token2Pool);
  } catch (err) {
    return null;
  }
  if (
    liquidityBurned_.isGreaterThan(0) &&
    totalLiquidity_.isGreaterThan(0) &&
    token1Pool_.isGreaterThan(0) &&
    token2Pool_.isGreaterThan(0)
  ) {
    // tokenPool_ * liquidityBurned_ / totalLiquidity_
    const token1Output = token1Pool_
      .times(liquidityBurned_)
      .dividedBy(totalLiquidity_);
    const token2Output = token2Pool_
      .times(liquidityBurned_)
      .dividedBy(totalLiquidity_);
    return { token1Output, token2Output };
  } else {
    return null;
  }
};
