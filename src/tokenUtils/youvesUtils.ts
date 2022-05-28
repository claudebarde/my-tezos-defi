import BigNumber from "bignumber.js";
import type { TezosToolkit } from "@taquito/taquito";
import { get } from "svelte/store";
import { Option, Result } from "@swan-io/boxed";
import { AvailableInvestment, AvailableToken } from "../types";
import type {
  InvestmentData,
  TezosAccountAddress,
  TezosContractAddress
} from "../types";
import _store from "../store";

export interface UnifiedStakeItem {
  id: BigNumber;
  age_timestamp: string;
  stake: BigNumber;
  token_amount: BigNumber;
}
export interface UnifiedStakeExtendedItem {
  id: BigNumber;
  age_timestamp: string;
  stake: BigNumber;
  token_amount: BigNumber;
  endTimestamp: string;
  originalStake: BigNumber;
  rewardTotal: BigNumber;
  rewardNow: BigNumber;
  rewardNowPercentage: BigNumber;
}

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
  if (invData.id === AvailableInvestment["YOUVES-UUSD-UBTC"]) {
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
  } else if (invData.id === AvailableInvestment["YOUVES-YOU-STAKING"]) {
    const stakeNumbers: Array<number> | undefined =
      await rewardsPoolStorage.stakes_owner_lookup.get(userAddress);
    if (
      !stakeNumbers ||
      (Array.isArray(stakeNumbers) && stakeNumbers.length === 0)
    )
      return null;

    const stake = await rewardsPoolStorage.stakes.get(stakeNumbers[0]);
    if (!stake) return null;

    const store = get(_store);
    const userYou = store.userTokens.find(tk => tk.name === AvailableToken.YOU);
    if (!userYou) return null;

    const result = await getOwnStakesWithExtraInfo(
      Tezos,
      stakeNumbers,
      invData.address,
      userYou.balance
    );

    return result[0].rewardNow
      .dividedBy(10 ** store.tokens.YOU.decimals)
      .toNumber();
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

export const calcYouvesRewards = async (
  Tezos: TezosToolkit,
  invData: InvestmentData,
  userAddress: TezosAccountAddress
): Promise<
  Option<{
    availableRewards: number;
    longTermRewards: number;
    fullRewardsAvailable: number;
  }>
> => {
  let longTermRewards, fullRewardsAvailable;

  const store = get(_store);

  const rewards = await getYouvesRewards(
    Tezos,
    invData,
    userAddress,
    store.tokens.YOU.decimals
  );
  if (rewards && !isNaN(rewards)) {
    if (
      invData.type === "long-term" &&
      invData.id !== AvailableInvestment["YOUVES-YOU-STAKING"]
    ) {
      // computes the long term rewards
      const rewardsPoolContract = await Tezos.wallet.at(invData.address);
      const rewardsPoolStorage: any = await rewardsPoolContract.storage();
      const stake = await rewardsPoolStorage.stakes.get(userAddress);
      const longTermRewards_ = longTermFarmFullRewards(
        rewardsPoolStorage.dist_factor,
        stake.stake.dividedBy(10 ** invData.decimals),
        stake.dist_factor,
        invData.decimals
      );
      if (longTermRewards_) {
        longTermRewards = longTermRewards_ / 10 ** store.tokens.YOU.decimals;
      }
      fullRewardsAvailable =
        Date.parse(stake.age_timestamp) + 180 * 24 * 60 * 60 * 1000;
    }

    return Option.Some({
      availableRewards: rewards,
      longTermRewards,
      fullRewardsAvailable
    });
  } else {
    return Option.None();
  }
};

export const calcYouvesStake = async (
  invData: InvestmentData,
  Tezos: TezosToolkit,
  userAddress: TezosAccountAddress
): Promise<
  Result<
    { stakeInXtz: number; totalSupply: { inToken: number; inTez: number } },
    string
  >
> => {
  const store = get(_store);
  let stakeInXtz: number;
  let totalSupply: { inToken: number; inTez: number };

  if (invData.id === AvailableInvestment["YOUVES-UUSD-UBTC"]) {
    const token1 = AvailableToken.uUSD;
    const token2 = AvailableToken.uBTC;
    const stakingToken = "LPT";
    const dexAddress = "KT1VNEzpf631BLsdPJjt2ZhgUitR392x6cSi";
    const contract = await Tezos.wallet.at(dexAddress);
    const storage: any = await contract.storage();
    const pair = await storage.storage.pairs.get(21);
    if (pair) {
      const { token_a_pool, token_b_pool, total_supply } = pair;
      const lptPrice = computeLpTokenPrice(
        invData.balance,
        total_supply,
        token_a_pool,
        token_b_pool
      );
      if (lptPrice) {
        const { token1Output, token2Output } = lptPrice;
        const token1Value = token1Output.toNumber();
        const token2Value = token2Output.toNumber();

        stakeInXtz =
          (token1Value / 10 ** store.tokens.uUSD.decimals) *
            store.tokens[token1].getExchangeRate() +
          (token2Value / 10 ** store.tokens.uBTC.decimals) *
            store.tokens[token2].getExchangeRate();
      }
      // computes total supply value in XTZ
      const totalSupplyPrice = computeLpTokenPrice(
        total_supply,
        total_supply,
        token_a_pool,
        token_b_pool
      );
      if (totalSupplyPrice) {
        const { token1Output, token2Output } = totalSupplyPrice;
        totalSupply = {
          inToken: total_supply.toNumber(),
          inTez:
            (token1Output.toNumber() / 10 ** store.tokens.uUSD.decimals) *
              store.tokens[token1].getExchangeRate() +
            (token2Output.toNumber() / 10 ** store.tokens.uBTC.decimals) *
              store.tokens[token2].getExchangeRate()
        };
      }
      // computes the long term rewards
      const rewardsPoolContract = await Tezos.wallet.at(invData.address);
      const rewardsPoolStorage: any = await rewardsPoolContract.storage();
      const stake = await rewardsPoolStorage.stakes.get(userAddress);
      const longTermRewards_ = longTermFarmFullRewards(
        rewardsPoolStorage.dist_factor,
        stake.stake.dividedBy(10 ** invData.decimals),
        stake.dist_factor,
        invData.decimals
      );
      if (longTermRewards_) {
        const longTermRewards =
          longTermRewards_ / 10 ** store.tokens.YOU.decimals;
      }
      const availableRewards =
        Date.parse(stake.age_timestamp) + 180 * 24 * 60 * 60 * 1000;
    }
  } else if (invData.id === AvailableInvestment["YOUVES-UUSD-WUSDC"]) {
    const token1 = AvailableToken.uUSD;
    const token2 = AvailableToken.wUSDC;
    const dexAddress = "KT1JeWiS8j1kic4PHx7aTnEr9p4xVtJNzk5b";
    const contract = await Tezos.wallet.at(dexAddress);
    const storage: any = await contract.storage();
    const { cashPool, tokenPool, lqtTotal } = storage;
    const lptPrice = computeLpTokenPrice(
      invData.balance,
      lqtTotal,
      tokenPool,
      cashPool
    );
    if (lptPrice) {
      const { token1Output, token2Output } = lptPrice;
      const token1Value = token1Output.toNumber();
      const token2Value = token2Output.toNumber();
      stakeInXtz =
        (token1Value / 10 ** store.tokens.uUSD.decimals) *
          store.tokens[token1].getExchangeRate() +
        (token2Value / 10 ** store.tokens.wUSDC.decimals) *
          store.tokens[token2].getExchangeRate();

      // computes total supply value in XTZ
      const totalSupplyPrice = computeLpTokenPrice(
        lqtTotal,
        lqtTotal,
        tokenPool,
        cashPool
      );
      if (totalSupplyPrice) {
        const { token1Output, token2Output } = totalSupplyPrice;
        totalSupply = {
          inToken: lqtTotal.toNumber(),
          inTez:
            (token1Output.toNumber() / 10 ** store.tokens.uUSD.decimals) *
              store.tokens[token1].getExchangeRate() +
            (token2Output.toNumber() / 10 ** store.tokens.wUSDC.decimals) *
              store.tokens[token2].getExchangeRate()
        };
      }
    }
  } else {
    stakeInXtz =
      (invData.balance / 10 ** store.tokens.YOU.decimals) *
      store.tokens.YOU.getExchangeRate();
  }

  if (stakeInXtz && !isNaN(stakeInXtz)) {
    return Result.Ok({ stakeInXtz, totalSupply });
  } else {
    return Result.Error(
      `Stake in XTZ coudn't be computed for ${invData.alias}`
    );
  }
};

const getOwnStakes = async (
  stakeIds: Array<number>,
  dexStorage
): Promise<UnifiedStakeItem[]> => {
  const stakes: UnifiedStakeItem[] = await Promise.all(
    stakeIds.map(async id => {
      const stakeData: any = await dexStorage.stakes.get(id);
      return { id, ...stakeData };
    })
  );

  return stakes;
};

const getClaimNowFactor = (stake: UnifiedStakeItem, dexStorage): BigNumber => {
  if (!stake) {
    return new BigNumber(0);
  }
  const dateStaked = new Date(stake.age_timestamp);
  const secondsSinceStaked = (Date.now() - dateStaked.getTime()) / 1000;
  const factor = secondsSinceStaked / dexStorage.max_release_period;
  return BigNumber.min(1, BigNumber.max(factor, 0));
};
const getOwnStakesWithExtraInfo = async (
  Tezos: TezosToolkit,
  stakeIds: Array<number>,
  farmAddress: TezosContractAddress,
  userYouBalance: number
): Promise<UnifiedStakeExtendedItem[] | null> => {
  const stakingPoolContract = await Tezos.wallet.at(farmAddress);
  const dexStorage: any = await stakingPoolContract.storage();
  const stakes = await getOwnStakes(stakeIds, dexStorage);
  // const rewardTokenBalance = new BigNumber(
  //   await getFA2Balance(
  //     this.stakingContract,
  //     this.rewardToken.contractAddress,
  //     this.rewardToken.tokenId,
  //     this.tezos,
  //     mainnetNetworkConstants.fakeAddress,
  //     mainnetNetworkConstants.balanceOfViewerCallback
  //   )
  // )
  const youContract = await Tezos.wallet.at(
    "KT1Xobej4mc6XgEjDoJoHtTKgbD1ELMvcQuL"
  );
  const youStorage: any = await youContract.storage();
  const rewardTokenBalance = await youStorage.ledger.get({
    token_id: 0,
    owner: farmAddress
  });
  if (!rewardTokenBalance) return null;

  return Promise.all(
    stakes.map(async stake => {
      // const rewardTotal = dexStorage.disc_factor.times(stake.stake).shiftedBy(-1 * mainnetTokens.youToken.decimals)
      const claimNowFactor = await getClaimNowFactor(stake, dexStorage);
      const entireWithdrawableAmount = rewardTokenBalance
        .times(stake.stake)
        .div(dexStorage.total_stake);
      return {
        ...stake,
        endTimestamp: new Date(
          new Date(stake.age_timestamp).getTime() +
            dexStorage.max_release_period * 1000
        ).toString(),
        originalStake: stake.token_amount,
        rewardTotal: BigNumber.max(
          0,
          entireWithdrawableAmount.minus(stake.token_amount)
        ),
        rewardNow: BigNumber.max(
          0,
          entireWithdrawableAmount
            .minus(stake.token_amount)
            .times(claimNowFactor)
        ),
        rewardNowPercentage: claimNowFactor
          .times(100)
          .decimalPlaces(2, BigNumber.ROUND_DOWN)
      };
    })
  );
};
