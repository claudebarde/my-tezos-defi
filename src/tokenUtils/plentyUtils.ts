import type { TezosToolkit } from "@taquito/taquito";
import { AvailableInvestments, AvailableToken } from "../types";
import { get } from "svelte/store";
import store from "../store";
import config from "../config";
import type { TezosContractAddress } from "../types";

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
      } else if (id.slice(0, 4).toLowerCase() === "ctez") {
        // when staked token is Ctez
        stakeInXtz =
          (tokens.token1Amount / 10 ** localStore.tokens.Ctez.decimals) *
            localStore.tokens.Ctez.exchangeRate +
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

export const getLPTokenPrice = async ({
  tokenPair,
  token1_price,
  token1_decimal,
  token2_price,
  token2_decimal,
  lp_token_decimal,
  Tezos
}: {
  tokenPair: AvailableInvestments;
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
  const localStore = get(store);
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
export const computeTokenOutput = (
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
};

/*export const loadSwapData = async (
  Tezos: TezosToolkit,
  tokenIn: AvailableToken,
  tokenOut: AvailableToken
) => {
  const localStore = get(store);

  try {
    const dexAddresses = Object.keys(config.plentyDexAddresses);
    const dexName = dexAddresses.find(name =>
      name.includes(`${tokenIn}-${tokenOut}`)
    );
    if (dexName) {
      const dexContractAddress = config.plentyDexAddresses[dexName];

      const dexContractInstance = await Tezos.contract.at(dexContractAddress);
      const dexStorage: any = await dexContractInstance.storage();
      let systemFee = await dexStorage.systemFee;
      systemFee = systemFee.toNumber();
      let lpFee = await dexStorage.lpFee;
      lpFee = lpFee.toNumber();
      let token1_pool = await dexStorage.token1_pool;
      token1_pool = token1_pool.toNumber();
      let token2_pool = await dexStorage.token2_pool;
      token2_pool = token2_pool.toNumber();
      let lpTokenSupply = await dexStorage.totalSupply;
      lpTokenSupply = lpTokenSupply.toNumber();
      const lpToken = dexName;
      let tokenIn_supply = 0;
      let tokenOut_supply = 0;
      if (
        CONFIG.AMM[connectedNetwork][tokenIn].DEX_PAIRS[tokenOut].property ===
        "token2_pool"
      ) {
        tokenOut_supply = token2_pool;
        tokenIn_supply = token1_pool;
      } else {
        tokenOut_supply = token1_pool;
        tokenIn_supply = token2_pool;
      }
      const tokenIn_Decimal = localStore.tokens[tokenIn].decimals;
      const tokenOut_Decimal = localStore.tokens[tokenOut].decimals;
      const liquidityToken_Decimal = localStore.investments[dexName].decimals;
      tokenIn_supply = tokenIn_supply / Math.pow(10, tokenIn_Decimal);
      tokenOut_supply = tokenOut_supply / Math.pow(10, tokenOut_Decimal);
      lpTokenSupply = lpTokenSupply / Math.pow(10, liquidityToken_Decimal);
      const exchangeFee = 1 / lpFee + 1 / systemFee;
      const tokenOutPerTokenIn = tokenOut_supply / tokenIn_supply;
      return {
        success: true,
        tokenIn,
        tokenIn_supply,
        tokenOut,
        tokenOut_supply,
        exchangeFee,
        tokenOutPerTokenIn,
        lpTokenSupply,
        lpToken,
        dexContractInstance
      };
    } else {
      throw "Unable to find DEX address";
    }
  } catch (error) {
    console.log({ message: "swap data error", error });
    return {
      success: true,
      tokenIn,
      tokenIn_supply: 0,
      tokenOut,
      tokenOut_supply: 0,
      exchangeFee: 0,
      tokenOutPerTokenIn: 0,
      lpTokenSupply: 0,
      lpToken: null,
      dexContractInstance: null
    };
  }
};

export const getRouteSwapData = async (tokenIn, tokenOut, middleToken) => {
  try {
    const response = await Promise.all([
      loadSwapData(tokenIn, middleToken[0].name),
      loadSwapData(middleToken[0].name, tokenOut)
    ]);
    const tokenOutPerTokenIn =
      (response[0].tokenOut_supply / response[0].tokenIn_supply) *
      (response[1].tokenOut_supply / response[1].tokenIn_supply);
    return {
      success: true,
      inToMid: response[0],
      midToOut: response[1],
      tokenOutPerTokenIn: tokenOutPerTokenIn
    };
  } catch (error) {
    return {
      success: false,
      inToMid: null,
      midToOut: null,
      tokenOutPerTokenIn: 0
    };
  }
};

export const computeTokenOutForRouteBase = (
  inputAmount,
  swapData,
  slippage
) => {
  try {
    const inToMidOutput = computeTokenOutput(
      inputAmount,
      swapData.inToMid.tokenIn_supply,
      swapData.inToMid.tokenOut_supply,
      swapData.inToMid.exchangeFee,
      slippage
    );

    const midToOutOutput = computeTokenOutput(
      inToMidOutput.tokenOut_amount,
      swapData.midToOut.tokenIn_supply,
      swapData.midToOut.tokenOut_supply,
      swapData.midToOut.exchangeFee,
      slippage
    );

    return {
      tokenOut_amount: midToOutOutput.tokenOut_amount,
      fees: inToMidOutput.fees,
      addtPlentyFee: inToMidOutput.tokenOut_amount / 400,
      minimum_Out: midToOutOutput.minimum_Out,
      minimum_Out_Plenty: inToMidOutput.minimum_Out,
      priceImpact: inToMidOutput.priceImpact + midToOutOutput.priceImpact
    };
  } catch (err) {
    console.log(err);
    return {
      tokenOut_amount: 0,
      fees: 0,
      minimum_Out: 0,
      priceImpact: 0
    };
  }
};*/
