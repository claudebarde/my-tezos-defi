import { get } from "svelte/store";
import { Option, Result } from "@swan-io/boxed";
import type { TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";
import {
  getKdaoReward,
  estimateQuipuTezInShares,
  estimateQuipuTokenInShares,
  formatTokenAmount
} from "../utils";
import { computeLpTokenPrice } from "../tokenUtils/youvesUtils";
import type { InvestmentData, TezosAccountAddress } from "../types";
import _store from "../store";
import config from "../config";

export const calcKdaoRewards = async (
  invData: InvestmentData,
  userAddress: TezosAccountAddress,
  currentLevel: number
): Promise<Option<number>> => {
  const store = get(_store);

  const rewardsRes = await getKdaoReward(
    invData.address,
    userAddress,
    currentLevel
  );
  if (rewardsRes) {
    return Option.Some(
      rewardsRes.toNumber() / 10 ** store.tokens.kDAO.decimals
    );
  } else {
    return Option.None();
  }
};

export const calcKdaoStake = async (
  invData: InvestmentData,
  Tezos: TezosToolkit
): Promise<Result<number, string>> => {
  let stakeInXtz: number;
  let store = get(_store);

  if (invData.id === "KUSD-KDAO") {
    stakeInXtz =
      +(
        (invData.balance / 10 ** store.tokens.kUSD.decimals) *
        store.tokens.kUSD.getExchangeRate()
      ).toFixed(5) / 1;
  } else if (invData.id === "KUSD-QUIPU-LP") {
    const tezInStakesRaw = await estimateQuipuTezInShares(
      store.Tezos,
      "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
      invData.balance
    );
    const tezInStakes = tezInStakesRaw.toNumber() / 10 ** 6;
    const tokensInStakesRaw = await estimateQuipuTokenInShares(
      Tezos,
      "KT1K4EwTpbvYN9agJdjpyJm4ZZdhpUNKB3F6",
      invData.balance
    );
    const tokensInStakes =
      (tokensInStakesRaw.toNumber() / 10 ** store.tokens.kUSD.decimals) *
      store.tokens.kUSD.getExchangeRate();

    stakeInXtz = formatTokenAmount(tezInStakes + tokensInStakes);
  } else if (invData.id === "KUSD-QL") {
    // Load kUSD Contract
    const kUSDContract = await Tezos.wallet.at(store.tokens.kUSD.address);
    const kUSDStorage: any = await kUSDContract.storage();

    // Load Liq Pool Contract
    const liqContract = await Tezos.wallet.at(config.kusdLiquidityPoolAddress);
    const liqStorage: any = await liqContract.storage();

    // Get number of kUSD in the liquidity pool
    let poolBalance = await kUSDStorage.balances.get(
      config.kusdLiquidityPoolAddress
    );
    if (poolBalance === undefined) {
      poolBalance = new BigNumber(0);
    } else {
      poolBalance = poolBalance.balance;
    }

    // Get number of LP tokens outstanding
    const lpBalance = liqStorage.totalSupply;

    // Changed fixed point numbers into decimals
    const KUSD_MANTISSA = Math.pow(10, 18); // kUSD has 18 decimals
    const LP_MANTISSA = Math.pow(10, 36); // LP has 36 decimals
    const kUSDBalanceDecimal = poolBalance.dividedBy(KUSD_MANTISSA);
    const lpBalanceDecimal = lpBalance.dividedBy(LP_MANTISSA);

    // Calculate an exchange rate
    // toFixed() will give you n digits of precision
    const redeemRate = kUSDBalanceDecimal
      .dividedBy(lpBalanceDecimal)
      .toFixed(2);

    stakeInXtz = formatTokenAmount(
      +(invData.balance / 10 ** invData.decimals) *
        redeemRate *
        store.tokens.kUSD.getExchangeRate()
    );
  } else if (invData.id === "KDAO-KUSD-UUSD") {
    const kUSDuUSDdexAddress = "KT1AVbWyM8E7DptyBCu4B5J5B7Nswkq7Skc6";
    const contract = await Tezos.wallet.at(kUSDuUSDdexAddress);
    const storage: any = await contract.storage();
    const computedResult = computeLpTokenPrice(
      invData.balance,
      storage.lqtTotal,
      storage.cashPool,
      storage.tokenPool
    );
    if (computedResult) {
      // calculates stake in XTZ
      const token1ToXtz =
        (computedResult.token1Output.toNumber() /
          10 ** store.tokens.kUSD.decimals) *
        store.tokens.kUSD.getExchangeRate();
      const token2ToXtz =
        (computedResult.token2Output.toNumber() /
          10 ** store.tokens.uUSD.decimals) *
        store.tokens.uUSD.getExchangeRate();
      stakeInXtz = token1ToXtz + token2ToXtz;
    }
  }

  if (stakeInXtz && !isNaN(stakeInXtz)) {
    return Result.Ok(stakeInXtz);
  } else {
    return Result.Error(
      `Stake in XTZ coudn't be computed for ${invData.alias}`
    );
  }
};
