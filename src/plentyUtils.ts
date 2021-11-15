import type { TezosToolkit } from "@taquito/taquito";
import { AvailableInvestments, AvailableToken } from "./types";
import { get } from "svelte/store";
import store from "./store";
import config from "./config";

export const formatPlentyLpAmount = (
  lpAmount: number,
  exchangePair: string
): number => {
  switch (exchangePair) {
    case "PLENTY-SMAK-LP":
      return lpAmount / 10 ** 8;
    case "PLENTY-wUSDC":
    case "PLENTY-USDtz-LP":
    case "PLENTY-QUIPU-LP":
    case "PLENTY-hDAO-LP":
    case "PLENTY-wUSDT-LP":
    case "PLENTY-Ctez-LP":
      return lpAmount / 10 ** 6;
    case "PLENTY-wWBTC":
    case "PLENTY-tzBTC-LP":
    case "PLENTY-WRAP-LP":
    case "PLENTY-UNO-LP":
      return lpAmount / 10 ** 5;
    case "PLENTY-uUSD-LP":
    case "PLENTY-KALAM-LP":
      return lpAmount / 10 ** 4;
    case "PLENTY-YOU-LP":
      return lpAmount / 10 ** 3;
    default:
      return lpAmount;
  }
};

export const getLPConversion = (
  token1_pool: number,
  token2_pool: number,
  totalSupply: number,
  lpAmount: number
) => {
  const token1Amount = (token1_pool * lpAmount) / totalSupply;
  const token2Amount = (token2_pool * lpAmount) / totalSupply;
  return {
    token1Amount,
    token2Amount
  };
};

export const getPlentyLqtValue = async (
  exchangePair: AvailableInvestments,
  exchangeAddress: string,
  lpAmount: number,
  Tezos: TezosToolkit
) => {
  try {
    if (!exchangeAddress) throw `No exchange address for ${exchangePair}`;

    // formats LP token amount according to exchange
    const formattedLpAmount = formatPlentyLpAmount(lpAmount, exchangePair);

    const exchangeContract = await Tezos.wallet.at(exchangeAddress);
    const exchangeStorage: any = await exchangeContract.storage();
    const tokenAmounts = getLPConversion(
      exchangeStorage.token1_pool.toNumber(),
      exchangeStorage.token2_pool.toNumber(),
      exchangeStorage.totalSupply.toNumber(),
      formattedLpAmount
    );
    return { ...tokenAmounts, token2: exchangePair.split("-")[1] };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getPlentyReward = async (
  userAddress: string,
  stakingContractAddress: string,
  currentLevel: number,
  decimals: number
) => {
  const localStore = get(store);

  try {
    if (!stakingContractAddress) {
      throw "No contract address provided";
    }

    const contract = await localStore.Tezos.wallet.at(stakingContractAddress);
    const storage: any = await contract.storage();
    if (storage.totalSupply.toNumber() == 0) {
      throw "No One Staked";
    }
    // Calculate Reward Per Token
    let rewardPerToken = Math.min(
      currentLevel,
      storage.periodFinish.toNumber()
    );
    rewardPerToken = rewardPerToken - storage.lastUpdateTime.toNumber();
    rewardPerToken *= storage.rewardRate.toNumber() * Math.pow(10, decimals);
    rewardPerToken =
      rewardPerToken / storage.totalSupply.toNumber() +
      storage.rewardPerTokenStored.toNumber();
    // Fetch User's Big Map Detais;   ​
    const userDetails = await storage.balances.get(userAddress);
    // Calculating Rewards   ​
    let totalRewards =
      userDetails.balance.toNumber() *
      (rewardPerToken - userDetails.userRewardPerTokenPaid.toNumber());
    totalRewards =
      totalRewards / Math.pow(10, decimals) + userDetails.rewards.toNumber();
    totalRewards = totalRewards / Math.pow(10, decimals); // Reducing to Token Decimals

    if (totalRewards >= 0) {
      return { status: true, totalRewards };
    } else {
      throw `Negative rewards: ${totalRewards}`;
    }
  } catch (error) {
    return { status: false, error };
  }
};

export const calcPlentyStakeInXtz = async ({
  isPlentyLpToken,
  id,
  balance,
  decimals,
  exchangeRate,
  rewardToken
}: {
  id: AvailableInvestments;
  isPlentyLpToken: boolean;
  balance: number;
  decimals: number;
  exchangeRate: number;
  rewardToken: AvailableToken;
}): Promise<number> => {
  if (!balance) return 0;

  const localStore = get(store);

  if (!isPlentyLpToken) {
    const stakeInXtz =
      +((balance / 10 ** decimals) * exchangeRate).toFixed(5) / 1;
    return stakeInXtz;
  } else {
    const tokens = await getPlentyLqtValue(
      id,
      config.plentyDexAddresses[id],
      balance,
      localStore.Tezos
    );
    if (!tokens) {
      return 0;
    } else {
      let stakeInXtz = 0;
      if (rewardToken === AvailableToken.YOU) {
        // when reward token is YOU
        stakeInXtz =
          (tokens.token1Amount / 10 ** localStore.tokens.uUSD.decimals) *
            localStore.tokens.uUSD.exchangeRate +
          (tokens.token2Amount /
            10 ** localStore.tokens[tokens.token2].decimals) *
            localStore.tokens[tokens.token2].exchangeRate;
      } else {
        // when reward token is PLENTY
        stakeInXtz =
          (tokens.token1Amount / 10 ** localStore.tokens.PLENTY.decimals) *
            localStore.tokens.PLENTY.exchangeRate +
          (tokens.token2Amount /
            10 ** localStore.tokens[tokens.token2].decimals) *
            localStore.tokens[tokens.token2].exchangeRate;
      }

      return +stakeInXtz.toFixed(5) / 1;
    }
  }
};
