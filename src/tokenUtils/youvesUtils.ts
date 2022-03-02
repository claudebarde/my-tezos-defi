import BigNumber from "bignumber.js";
import type { TezosToolkit } from "@taquito/taquito";
import {
  InvestmentData,
  TezosAccountAddress,
  AvailableInvestments
} from "../types";

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

export const longTermFarmFullRewards = (
  poolDistFactor: number,
  stake: number,
  stakeDistFactor,
  lptDecimals: number
): number => {
  const currentDistFactor = new BigNumber(poolDistFactor);
  if (!stake) {
    return 0;
  }
  const ownStake = new BigNumber(stake);
  const reward = ownStake
    .multipliedBy(currentDistFactor.minus(stakeDistFactor))
    .dividedBy(10 ** lptDecimals);

  return reward.toNumber();
};

export const getYouvesRewards = async (
  Tezos: TezosToolkit,
  invData: InvestmentData,
  userAddress: TezosAccountAddress,
  youTokenDecimals: number
): Promise<number | null> => {
  const rewardsPoolContract = await Tezos.wallet.at(invData.address);
  const rewardsPoolStorage: any = await rewardsPoolContract.storage();
  if (invData.id === AvailableInvestments["YOUVES-UUSD-UBTC"]) {
    const stake = await rewardsPoolStorage.stakes.get(userAddress);
    if (!stake) {
      return null;
    }

    const longTermRewards = longTermFarmFullRewards(
      rewardsPoolStorage.dist_factor,
      stake.stake.dividedBy(10 ** invData.decimals),
      stake.dist_factor,
      invData.decimals
    );
    const dateStaked = new Date(stake.age_timestamp);
    const secondsSinceStaked = (Date.now() - dateStaked.getTime()) / 1000;
    const factor = secondsSinceStaked / rewardsPoolStorage.max_release_period;
    const claimFactor = BigNumber.min(1, BigNumber.max(factor, 0));

    return (claimFactor.toNumber() * longTermRewards) / 10 ** youTokenDecimals;
  } else {
    let currentDistFactor = rewardsPoolStorage.dist_factor;
    const ownStake = new BigNumber(
      await rewardsPoolStorage.stakes.get(userAddress)
    );
    const ownDistFactor = new BigNumber(
      await rewardsPoolStorage.dist_factors.get(userAddress)
    );

    const reward = ownStake
      .multipliedBy(currentDistFactor.minus(ownDistFactor))
      .dividedBy(10 ** invData.decimals)
      .dividedBy(10 ** youTokenDecimals);

    return reward.toNumber();
  }
};
