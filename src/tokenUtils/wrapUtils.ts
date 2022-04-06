import BigNumber from "bignumber.js";
import { get } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import store from "../store";
import { AvailableInvestment } from "../types";
import type {
  InvestmentData,
  TezosContractAddress,
  TezosAccountAddress,
  TokenAmount
} from "../types";
import {
  formatTokenAmount,
  estimateQuipuTezInShares,
  estimateQuipuTokenInShares
} from "../utils";
import config from "../config";

export const getWrapReward = async (
  farmId: AvailableInvestment,
  farmAddress: TezosContractAddress,
  userAddress: TezosAccountAddress,
  userBalance: number
): Promise<null | BigNumber> => {
  if (!farmAddress || !userAddress || !farmId) return null;

  const localStore = get(store);

  if (farmId === AvailableInvestment["WRAP-STACKING"]) {
    try {
      const contract = await localStore.Tezos.wallet.at(farmAddress, tzip16);
      const views = await contract.tzip16().metadataViews();
      const reward = await views.get_earned().executeView(userAddress);
      if (reward) {
        return reward;
      } else {
        return new BigNumber(0);
      }
    } catch (error) {
      console.error(error);
      return new BigNumber(0);
    }
  } else if (farmId.slice(-3) === "-LM") {
    // liquidity mining pools
    const reward = await calcWrapLiquidityMiningReward(
      farmAddress,
      userAddress,
      localStore.currentLevel
    );

    return reward;
  } else if (farmId.slice(-3) === "-FM") {
    // fee mining pools
    return await calcWrapFeeMiningReward(farmAddress, userAddress, userBalance);
  } else {
    return new BigNumber(0);
  }
};

const calcWrapLiquidityMiningReward = async (
  poolAddress: string,
  owner: TezosAccountAddress,
  currentLevel: number
) => {
  //const delegatorRecord = await storage['delegators'].get(owner);
  try {
    // fetches the storage
    const storageRes = await fetch(
      `https://api.tzkt.io/v1/contracts/${poolAddress}/storage`
    );
    if (storageRes) {
      const storage = await storageRes.json();
      const { farm, farmLpTokenBalance } = storage;
      // fetches delegator's data
      const delegatorDataRes = await fetch(
        `https://api.tzkt.io/v1/contracts/${poolAddress}/bigmaps/delegators/keys/${owner}`
      );
      if (delegatorDataRes) {
        const delegatorRecord = await delegatorDataRes.json();
        const accRewardPerShareStart = new BigNumber(
          delegatorRecord.value.accumulatedRewardPerShareStart
        );
        const accRewardPerShareEnd = updateWrapLiquidityMiningPool(
          currentLevel,
          farm,
          farmLpTokenBalance
        );
        const accumulatedRewardPerShare = accRewardPerShareEnd.minus(
          accRewardPerShareStart
        );
        const delegatorReward = accumulatedRewardPerShare.multipliedBy(
          delegatorRecord.value.lpTokenBalance
        );
        // remove precision
        return delegatorReward
          .div(1000000)
          .integerValue()
          .div(10 ** 8);
      } else {
        return new BigNumber(0);
      }
    } else {
      throw `calcWrapLiquidityMiningReward: No storage returned for ${poolAddress}`;
    }
  } catch (err) {
    console.error(err);
    return new BigNumber(0);
  }
};

const calcWrapFeeMiningReward = async (
  poolAddress: string,
  owner: TezosAccountAddress,
  balance: number
) => {
  try {
    // fetches the storage
    const storageRes = await fetch(
      `https://api.tzkt.io/v1/contracts/${poolAddress}/storage`
    );
    if (storageRes) {
      const { reward } = await storageRes.json();
      // fetches the delegator data
      const delegatorRes = await fetch(
        `https://api.tzkt.io/v1/contracts/${poolAddress}/bigmaps/delegators/keys/${owner}`
      );
      if (delegatorRes) {
        const delegatorData = await delegatorRes.json();
        const delegator = delegatorData.value;
        // calculates standing rewards
        let userReward =
          +balance *
          (+reward.accumulated_reward_per_token -
            +delegator.reward_per_token_paid);
        userReward += +delegator.unpaid;

        if (!isNaN(userReward)) {
          return new BigNumber(formatTokenAmount(userReward / 10 ** 24));
        } else {
          return new BigNumber(0);
        }
      } else {
        throw `Unable to fetch delegators bigmap for ${poolAddress}`;
      }
    } else {
      throw `Unable to fetch storage for ${poolAddress}`;
    }
  } catch (error) {
    console.error(error);
    return new BigNumber(0);
  }
};

const updateWrapLiquidityMiningPool = (
  currentLevel: number,
  farm: any,
  farmLpTokenBalance: number
) => {
  const lastBlockUpdate = new BigNumber(farm["lastBlockUpdate"]);
  const multiplier = new BigNumber(currentLevel).minus(lastBlockUpdate);

  const outstandingReward = multiplier.multipliedBy(
    new BigNumber(farm["plannedRewards"]["rewardPerBlock"])
  );

  const claimedRewards = new BigNumber(farm["claimedRewards"]["paid"]).plus(
    farm["claimedRewards"]["unpaid"]
  );
  const totalRewards = outstandingReward.plus(claimedRewards);
  const plannedRewards = new BigNumber(
    farm["plannedRewards"]["rewardPerBlock"]
  ).multipliedBy(new BigNumber(farm["plannedRewards"]["totalBlocks"]));
  const totalRewardsExhausted = totalRewards.isGreaterThan(plannedRewards);

  const reward = totalRewardsExhausted
    ? plannedRewards.minus(claimedRewards)
    : outstandingReward;

  return new BigNumber(farm["accumulatedRewardPerShare"]).plus(
    reward.multipliedBy(1000000).div(farmLpTokenBalance)
  );
};

export const calcTokenStakesInWrapFarms = async (param: {
  invData: InvestmentData;
  balance: number;
  Tezos: TezosToolkit;
  tokenExchangeRate: number;
  tokenDecimals: number;
}): Promise<number | null> => {
  let { invData, balance, Tezos, tokenExchangeRate, tokenDecimals } = param;
  if (invData && balance && Tezos) {
    const sharesInXtz = await estimateQuipuTezInShares(
      Tezos,
      config.wrapLiquidityMiningDexAddress[invData.id],
      balance
    );
    const sharesInToken = await estimateQuipuTokenInShares(
      Tezos,
      config.wrapLiquidityMiningDexAddress[invData.id],
      balance
    );
    if (sharesInXtz && sharesInToken) {
      return (
        sharesInXtz.toNumber() / 10 ** 6 +
        (sharesInToken.toNumber() / 10 ** tokenDecimals) * tokenExchangeRate
      );
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export const calcWrapUnstakingFee = (
  currentLevel: number,
  amounts: {
    stakingLevel: number;
    amount: TokenAmount;
  }[]
): { amount: TokenAmount; fee: TokenAmount; percent: number }[] | null => {
  // fee schema = {[number of levels]: percentage for fee}
  const feeSchema = {
    20160: 25,
    80640: 12.5,
    241920: 6.25,
    [currentLevel + 1]: 4
  };

  const results = amounts.map(el => {
    const fee = Object.entries(feeSchema).find(
      ([level, _]) => currentLevel - el.stakingLevel < +level
    );
    if (fee) {
      const [_, percent] = fee;
      return {
        amount: el.amount,
        fee: (el.amount * percent) / 100,
        percent
      };
    } else {
      return null;
    }
  });
  if (results.some(el => el === null)) {
    return null;
  } else {
    return results;
  }
};
