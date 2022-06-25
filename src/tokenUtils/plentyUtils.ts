import type { TezosToolkit } from "@taquito/taquito";
import { get } from "svelte/store";
import { Option, Result } from "@swan-io/boxed";
import { AvailableInvestment, AvailableToken } from "../types";
import type { InvestmentData, TezosAccountAddress, IconValue } from "../types";
import _store from "../store";
import config from "../config";
import type { TezosContractAddress } from "../types";
import { formatTokenAmount } from "../utils";

export const formatPlentyLpAmount = (
  lpAmount: number,
  exchangePair: string
): number => {
  switch (exchangePair) {
    case "Ctez-PAUL-LP":
    case "Ctez-wWBTC-LP":
      return lpAmount / 10 ** 11;
    case "PLENTY-SMAK-LP":
      return lpAmount / 10 ** 8;
    case "PLENTY-wUSDC":
    case "PLENTY-USDtz-LP":
    case "PLENTY-QUIPU-LP":
    case "PLENTY-hDAO-LP":
    case "PLENTY-wUSDT-LP":
    case "PLENTY-Ctez-LP":
    case "Ctez-kUSD-LP":
    case "Ctez-wDAI-LP":
    case "PLENTY-CTEZ-TEZ-LP":
      return lpAmount / 10 ** 6;
    case "PLENTY-wWBTC":
    case "PLENTY-tzBTC-LP":
    case "PLENTY-WRAP-LP":
    case "PLENTY-UNO-LP":
    case "PLENTY-DOGA-CTEZ-LP":
      return lpAmount / 10 ** 5;
    case "PLENTY-uUSD-LP":
    case "PLENTY-KALAM-LP":
      return lpAmount / 10 ** 4;
    case "PLENTY-YOU-LP":
      return lpAmount / 10 ** 3;
    default:
      if (exchangePair.match(/Ctez-[a-zA-Z]+-LP/)) {
        return lpAmount / 10 ** 12;
      } else {
        return lpAmount;
      }
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
  exchangePair: AvailableInvestment,
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
    let token1_pool, token2_pool, totalSupply;
    if (exchangePair === "PLENTY-CTEZ-TEZ-LP") {
      token1_pool = exchangeStorage.tezPool.toNumber();
      token2_pool = exchangeStorage.ctezPool.toNumber();
      totalSupply = exchangeStorage.lqtTotal.toNumber();
    } else {
      token1_pool = exchangeStorage.token1_pool.toNumber();
      token2_pool = exchangeStorage.token2_pool.toNumber();
      totalSupply = exchangeStorage.totalSupply.toNumber();
    }
    const tokenAmounts = getLPConversion(
      token1_pool,
      token2_pool,
      totalSupply,
      formattedLpAmount
    );
    return {
      ...tokenAmounts,
      token2:
        exchangePair === "PLENTY-CTEZ-TEZ-LP"
          ? AvailableToken.ctez
          : exchangePair.split("-")[1]
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getPlentyReward = async (
  userAddress: TezosAccountAddress,
  stakingContractAddress: string,
  currentLevel: number,
  decimals: number
): Promise<
  | { status: true; totalRewards: Array<number> }
  | { status: false; error: string }
> => {
  const localStore = get(_store);

  try {
    if (!stakingContractAddress) {
      throw "No contract address provided";
    }

    if (stakingContractAddress === "KT1WzUmmF98aQdpKnWigkg3SnJiL1s2Fj6QQ") {
      const rewards = await calculateDualReward(
        localStore.Tezos,
        "KT1QkadMTUTDxyNiTaz587ssPXFuwmWWQzDG",
        "KT1PxZCPGoxukDXq1smJcmQcLiadTB6czjCY",
        userAddress,
        currentLevel
      );

      return rewards.match<
        | { status: true; totalRewards: Array<number> }
        | { status: false; error: string }
      >({
        Ok: val => ({ status: true, totalRewards: val }),
        Error: err => ({ status: false, error: err })
      });
    } else {
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
        return { status: true, totalRewards: [totalRewards] };
      } else {
        throw `Negative rewards: ${totalRewards}`;
      }
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
  id: AvailableInvestment;
  isPlentyLpToken: boolean;
  balance: number;
  decimals: number;
  exchangeRate: number;
  rewardToken: AvailableToken;
}): Promise<number> => {
  if (!balance) return 0;

  const localStore = get(_store);

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
            localStore.tokens.uUSD.getExchangeRate() +
          (tokens.token2Amount /
            10 ** localStore.tokens[tokens.token2].decimals) *
            localStore.tokens[tokens.token2].getExchangeRate();
      } else if (id === "PLENTY-CTEZ-TEZ-LP") {
        // when staked token is Ctez
        stakeInXtz =
          tokens.token1Amount +
          tokens.token2Amount * localStore.tokens.ctez.getExchangeRate();
      } else if (id === "PLENTY-DOGA-CTEZ-LP") {
        stakeInXtz =
          (tokens.token2Amount / 10 ** localStore.tokens.ctez.decimals) *
            localStore.tokens.ctez.getExchangeRate() +
          (tokens.token1Amount / 10 ** localStore.tokens.DOGA.decimals) *
            localStore.tokens.DOGA.getExchangeRate();
      } else {
        // when reward token is PLENTY
        stakeInXtz =
          (tokens.token1Amount / 10 ** localStore.tokens.PLENTY.decimals) *
            localStore.tokens.PLENTY.getExchangeRate() +
          (tokens.token2Amount /
            10 ** localStore.tokens[tokens.token2].decimals) *
            localStore.tokens[tokens.token2].getExchangeRate();
      }

      return +stakeInXtz;
    }
  }
};

export const getLPTokenPrice = async ({
  tokenPair,
  token1_price,
  token1_decimal,
  token2_price,
  token2_decimal,
  lp_token_decimal,
  Tezos
}: {
  tokenPair: AvailableInvestment;
  token1_price: number;
  token1_decimal: number;
  token2_price: number;
  token2_decimal: number;
  lp_token_decimal: number;
  Tezos: TezosToolkit;
}) => {
  const dexAddress = config.plentyDexAddresses[tokenPair];
  const contract = await Tezos.wallet.at(dexAddress);
  const storage: any = await contract.storage();

  let token1Amount =
    (Math.pow(10, lp_token_decimal) * storage.token1_pool) /
    storage.totalSupply;
  token1Amount = (token1Amount * token1_price) / Math.pow(10, token1_decimal);

  let token2Amount =
    (Math.pow(10, lp_token_decimal) * storage.token2_pool) /
    storage.totalSupply;
  token2Amount = (token2Amount * token2_price) / Math.pow(10, token2_decimal);

  return +(token1Amount + token2Amount).toFixed(2);
};

export const calcPlentyAprApy = async (params: {
  farmAddress: TezosContractAddress;
  Tezos: TezosToolkit;
  rewardTokenPriceInFiat: number;
  stakeTokenPriceInFiat: number;
}): Promise<{ apr: number | null; apy: number | null }> => {
  let apr = null;
  let apy = null;

  const { farmAddress, Tezos, rewardTokenPriceInFiat, stakeTokenPriceInFiat } =
    params;
  // fetches the storage
  const farm = await Tezos.wallet.at(farmAddress);
  const farmStorage: any = await farm.storage();
  // calculates APR
  apr =
    ((farmStorage.rewardRate.toNumber() * 1051200 * rewardTokenPriceInFiat) /
      (farmStorage.totalSupply.toNumber() * stakeTokenPriceInFiat)) *
    100;

  if (apr) {
    apy = ((apr / 100 / 365 + 1) ** 365 - 1) * 100;
  }

  return { apr, apy };
};

const xPlentyComputation = async (
  Tezos: TezosToolkit,
  currentBlockLevel: number
) => {
  const localStore = get(_store);
  const rewardManagerAddress = "KT1MCgouivQ2rzam5hA2gqF1eMtY5i6ndJvT";
  const xPlentyCurveAddress = "KT1PxkrCckgh5fA5v2cZEE2bX5q2RV1rv8dj";

  try {
    const plentyTokenContract = await Tezos.contract.at(
      localStore.tokens.PLENTY.address
    );
    const xPlentyCurveContract = await Tezos.contract.at(xPlentyCurveAddress);
    const rewardManagerContract = await Tezos.contract.at(rewardManagerAddress);
    // Accessing Contract Storage
    const plentyStorage: any = await plentyTokenContract.storage();
    const rewardManagerStorage: any = await rewardManagerContract.storage();
    const xPlentyCurveStorage: any = await xPlentyCurveContract.storage();
    // Compute xPlentyCurve Contract's plenty balance
    let plentyBalance = await plentyStorage.balances.get(xPlentyCurveAddress);
    plentyBalance = plentyBalance.balance.toNumber();
    const balanceUpdate =
      Math.min(
        currentBlockLevel,
        rewardManagerStorage.periodFinish.toNumber()
      ) - rewardManagerStorage.lastUpdate.toNumber();
    if (balanceUpdate > 0) {
      plentyBalance +=
        balanceUpdate * rewardManagerStorage.rewardRate.toNumber();
    }

    const totalSupply = xPlentyCurveStorage.totalSupply.toNumber();
    return {
      plentyBalance,
      totalSupply
    };
  } catch (error) {
    console.error(error);
  }
};

export const getExpectedxPlenty = async (
  Tezos: TezosToolkit,
  plentyAmount: number,
  currentBlockLevel: number
) => {
  const results = await xPlentyComputation(Tezos, currentBlockLevel);
  return ((plentyAmount * results.totalSupply) / results.plentyBalance) * 0.995;
};

export const getExpectedPlenty = async (
  Tezos: TezosToolkit,
  xPlentyAmount: number,
  currentBlockLevel: number
) => {
  const results = await xPlentyComputation(Tezos, currentBlockLevel);
  try {
    if (results.totalSupply < xPlentyAmount) {
      throw "Invalid Request";
    }
    return (
      ((xPlentyAmount * results.plentyBalance) / results.totalSupply) * 0.995
    );
  } catch (error) {
    console.log(error);
  }
};

export const estimateLpTokenOutput = ({
  tokenIn_amount,
  tokenOut_amount,
  tokenIn_supply,
  tokenOut_supply,
  lpTokenSupply
}: {
  tokenIn_amount: number;
  tokenOut_amount: number;
  tokenIn_supply: number;
  tokenOut_supply: number;
  lpTokenSupply: number;
} | null) => {
  try {
    const lpOutputBasedOnTokenIn =
      (tokenIn_amount * lpTokenSupply) / tokenIn_supply;
    const lpOutputBasedOnTokenOut =
      (tokenOut_amount * lpTokenSupply) / tokenOut_supply;
    let estimatedLpOutput = 0;
    estimatedLpOutput =
      lpOutputBasedOnTokenIn < lpOutputBasedOnTokenOut
        ? lpOutputBasedOnTokenIn
        : lpOutputBasedOnTokenOut;
    return estimatedLpOutput;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// estimate token output for a swap
/*export const computeTokenOutput = (
  tokenIn_amount,
  tokenIn_supply,
  tokenOut_supply,
  exchangeFee,
  slippage
) => {
  try {
    let tokenOut_amount = 0;
    tokenOut_amount = (1 - exchangeFee) * tokenOut_supply * tokenIn_amount;
    tokenOut_amount /= tokenIn_supply + (1 - exchangeFee) * tokenIn_amount;
    const fees = tokenIn_amount * exchangeFee;
    const minimum_Out = tokenOut_amount - (slippage * tokenOut_amount) / 100;

    const updated_TokenIn_Supply = tokenIn_supply - tokenIn_amount;
    const updated_TokenOut_Supply = tokenOut_supply - tokenOut_amount;
    let next_tokenOut_Amount =
      (1 - exchangeFee) * updated_TokenOut_Supply * tokenIn_amount;
    next_tokenOut_Amount /=
      updated_TokenIn_Supply + (1 - exchangeFee) * tokenIn_amount;
    let priceImpact =
      (tokenOut_amount - next_tokenOut_Amount) / tokenOut_amount;
    priceImpact = priceImpact * 100;
    priceImpact = +priceImpact.toFixed(5);
    priceImpact = Math.abs(priceImpact);
    priceImpact = priceImpact * 100;

    return {
      tokenOut_amount,
      fees,
      minimum_Out,
      priceImpact
    };
  } catch (error) {
    return {
      tokenOut_amount: 0,
      fees: 0,
      minimum_Out: 0,
      priceImpact: 0
    };
  }
};*/

/*export const computeTokenOutput = (
  token1Amount: number,
  token1Reserve: number,
  token2Reserve: number,
  exchangeFee: number,
  slippage: number,
  token2Decimals: number
) => {
  let swapOutput = (1 - exchangeFee) * token2Reserve * token1Amount;
  swapOutput /= token1Reserve + (1 - exchangeFee) * token1Amount;
  swapOutput = swapOutput / 10 ** token2Decimals;

  const minimumOut = swapOutput - swapOutput * slippage;

  const fees = token1Amount * exchangeFee;

  return { token2Amount: swapOutput, minimumOut, fees };
};*/

export const computeTokenOutput = async (
  token1Amount: number,
  token1: { name: AvailableToken | "XTZ"; decimals: number },
  token2: { name: AvailableToken | "XTZ"; decimals: number },
  slippage: number
) => {
  const localStore = get(_store);

  const dexAddressVal = Object.entries(config.plentyDexAddresses).find(
    val => val[0].includes(token1.name) && val[0].includes(token2.name)
  );
  const [_, dexAddress] = dexAddressVal;
  const dexContract = await localStore.Tezos.wallet.at(dexAddress);
  const dexStorage: any = await dexContract.storage();
  const { lpFee, systemFee, token1_pool, token2_pool } = dexStorage;
  const exchangeFee = 1 / lpFee.toNumber() + 1 / systemFee.toNumber();

  let swapOutput = (1 - exchangeFee) * token2_pool.toNumber() * token1Amount;
  swapOutput /= token1_pool.toNumber() + (1 - exchangeFee) * token1Amount;
  swapOutput = swapOutput / 10 ** token2.decimals;

  const minimumOut = swapOutput - swapOutput * slippage;

  const fees = token1Amount * exchangeFee;

  return { token2Amount: swapOutput, minimumOut, fees };
};

export const calcPlentyRewards = async (
  invData: InvestmentData,
  userAddress: TezosAccountAddress,
  currentLevel: number
): Promise<Option<Array<number>>> => {
  const store = get(_store);

  const rewardsRes = await getPlentyReward(
    userAddress,
    invData.address,
    currentLevel,
    invData.rewardToken === AvailableToken.YOU ||
      invData.id === "PLENTY-CTEZ-TEZ-LP"
      ? store.investments[invData.id].decimals
      : 18
  );
  if (rewardsRes && rewardsRes.status) {
    return Option.Some(rewardsRes.totalRewards);
  } else {
    return Option.None();
  }
};

export const calcPlentyStake = async (
  invData: InvestmentData
): Promise<Result<number, string>> => {
  const store = get(_store);

  const stakeInXtz = await calcPlentyStakeInXtz({
    isPlentyLpToken: invData.platform === "plenty",
    id: invData.id,
    balance: invData.balance,
    decimals: invData.decimals,
    exchangeRate: store.tokens[invData.rewardToken].getExchangeRate(),
    rewardToken: invData.rewardToken
  });

  if ((stakeInXtz || stakeInXtz === 0) && !isNaN(stakeInXtz)) {
    return Result.Ok(stakeInXtz);
  } else {
    return Result.Error(
      `Stake in XTZ coudn't be computed for ${invData.alias}`
    );
  }
};

export const fetchPlentyStatistics = async (
  invData: InvestmentData,
  stakeInXtz: number
): Promise<
  Result<{ roiPerWeek: number; apr: number; apy: number }, string>
> => {
  const store = get(_store);

  const tokenPair = invData.id;
  const token1 = invData.icons[0];
  const token2 = invData.icons[1];

  let lpTokenPrice = await (async () => {
    // TODO: calculate APR/APY with TEZ pair
    if (token1 === ("XTZ" as IconValue)) {
      return Result.Error("error");
    } else if (token2 === ("XTZ" as IconValue)) {
      return Result.Error("error");
    } else {
      const res = await getLPTokenPrice({
        tokenPair,
        token1_price: store.tokens[token1].getExchangeRate(),
        token1_decimal: store.tokens[token1].decimals,
        token2_price: store.tokens[token2].getExchangeRate(),
        token2_decimal: store.tokens[token2].decimals,
        lp_token_decimal: store.investments[tokenPair].decimals,
        Tezos: store.Tezos
      });
      return Result.Ok(res);
    }
  })();
  const result = await lpTokenPrice.match({
    Error: () => undefined,
    Ok: async price =>
      await calcPlentyAprApy({
        Tezos: store.Tezos,
        farmAddress: invData.address,
        rewardTokenPriceInFiat:
          store.tokens[invData.rewardToken].getExchangeRate(),
        stakeTokenPriceInFiat: price
      })
  });
  if (result && !isNaN(result.apr) && !isNaN(result.apy)) {
    const apr = result.apr;
    const apy = result.apy;
    // calculates estimated ROI per week
    const roiPerWeek = +formatTokenAmount((stakeInXtz * apr) / 100 / 52, 2);

    return Result.Ok({
      roiPerWeek,
      apr,
      apy
    });
  } else {
    return Result.Error("Error while calculating Plenty's APR/APY");
  }
};

const calculateDualReward = async (
  tezos: TezosToolkit,
  plentyRewardAddress: string,
  xtzRewardAddress: string,
  userAddress: string,
  currentLevel: number
): Promise<Result<Array<number>, string>> => {
  try {
    let rewardArray = [];
    var plentyRewardContract = await tezos.contract.at(plentyRewardAddress);

    var plentyRewardStorage: any = await plentyRewardContract.storage();
    let rewardPerToken = Math.min(
      currentLevel,
      plentyRewardStorage.periodFinish.toNumber()
    );

    rewardPerToken =
      rewardPerToken - plentyRewardStorage.lastUpdateTime.toNumber();
    rewardPerToken *=
      plentyRewardStorage.rewardRate.toNumber() * Math.pow(10, 18);
    rewardPerToken =
      rewardPerToken / plentyRewardStorage.totalSupply.toNumber() +
      plentyRewardStorage.rewardPerTokenStored.toNumber();

    let userDetails = await plentyRewardStorage.balances.get(userAddress);

    let totalRewards =
      userDetails.balance.toNumber() *
      (rewardPerToken - userDetails.userRewardPerTokenPaid.toNumber());
    totalRewards =
      totalRewards / Math.pow(10, 18) + userDetails.rewards.toNumber();

    totalRewards = totalRewards / Math.pow(10, 18); // Reducing to Token Decimals

    rewardArray.push(totalRewards);
    // baking reward calculation
    const xtzRewardContract = await tezos.contract.at(xtzRewardAddress);
    const xtzRewardStorage: any = await xtzRewardContract.storage();
    rewardPerToken = Math.min(
      currentLevel,
      xtzRewardStorage.periodFinish.toNumber()
    );

    rewardPerToken =
      rewardPerToken - xtzRewardStorage.lastUpdateTime.toNumber();
    rewardPerToken *= xtzRewardStorage.rewardRate.toNumber() * Math.pow(10, 6);
    rewardPerToken =
      rewardPerToken / xtzRewardStorage.totalSupply.toNumber() +
      xtzRewardStorage.rewardPerTokenStored.toNumber();

    userDetails = await xtzRewardStorage.balances.get(userAddress);

    totalRewards =
      userDetails.balance.toNumber() *
      (rewardPerToken - userDetails.userRewardPerTokenPaid.toNumber());
    totalRewards =
      totalRewards / Math.pow(10, 6) + userDetails.rewards.toNumber();

    totalRewards = totalRewards / Math.pow(10, 6); // Reducing to Token Decimals

    rewardArray.push(totalRewards);

    if (
      rewardArray.length === 2 &&
      !isNaN(rewardArray[0]) &&
      !isNaN(rewardArray[1])
    ) {
      return Result.Ok(rewardArray);
    } else {
      return Result.Error(`Unexpected result type: ${rewardArray.toString()}`);
    }
  } catch (error) {
    console.log(error);
    return Result.Error(JSON.stringify(error));
  }
};
