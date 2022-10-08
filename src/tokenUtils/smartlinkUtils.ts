import { get } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import { Option, Result } from "@swan-io/boxed";
import BigNumber from "bignumber.js";
import config from "../config";
import type { InvestmentData } from "src/types";
import { calculateLqtOutput } from "../utils";
import _store from "../store";

const tokenToXtzXtzOutput = (
  tokenIn: BigNumber,
  xtzPool: BigNumber,
  tokenPool: BigNumber
): BigNumber | null => {
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
    const numerator = new BigNumber(tokenIn).times(new BigNumber(xtzPool));
    const denominator = new BigNumber(tokenPool).plus(new BigNumber(tokenIn));
    return numerator.dividedBy(denominator);
  } else {
    return null;
  }
};

export const tokenToXtz = (
  tokenIn: BigNumber,
  xtzPool: BigNumber,
  tokenPool: BigNumber
): number | null => {
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
    const tokenOutput = tokenToXtzXtzOutput(tokenIn_, xtzPool_, tokenPool_);
    if (tokenOutput === null) return null;

    return tokenOutput.dividedBy(tokenIn_).toNumber();
  } else {
    return null;
  }
};

export const fetchAntiPrice = async (
  tezos: TezosToolkit
): Promise<number | null> => {
  const liquidityProviderFee = 0.0028;
  const lptContract = await tezos.wallet.at(
    "KT1LTmkz5J7vESxZjHqazzdhGohS5uTXEa2G"
  ); // XTZ-ANTI LPT address
  const lptStorage: any = await lptContract.storage();
  const { total_supply } = lptStorage;
  // finds DEX address
  const dexAddress = config.vortexDexAddresses["XTZ-ANTI"];
  if (total_supply && dexAddress) {
    const dexContract = await tezos.wallet.at(dexAddress);
    const dexStorage: any = await dexContract.storage();
    const { xtzPool, tokenPool } = dexStorage;

    const result = tokenToXtz(new BigNumber(1), xtzPool, tokenPool);
    if (result && !isNaN(result)) {
      return result - result * liquidityProviderFee;
    } else {
      return null;
    }
  } else {
    return null;
  }
};

export const calcSmartlinkRewards = async (): Promise<Option<number>> => {
  return Option.Some(0);
};

export const calcSmartlinkStake = async (
  Tezos: TezosToolkit,
  invData: InvestmentData
): Promise<Result<number, string>> => {
  const store = get(_store);
  let stakeInXtz: number;

  // finds LP token total supply
  const contract = await Tezos.wallet.at(invData.address);
  const storage: any = await contract.storage();
  const { input_token_address } = storage;
  const lptContract = await Tezos.wallet.at(input_token_address);
  const lptStorage: any = await lptContract.storage();
  const { total_supply } = lptStorage;
  // finds DEX address
  const dexAddress =
    config.vortexDexAddresses[`${invData.icons[0]}-${invData.icons[1]}`];
  if (total_supply && dexAddress) {
    const dexContract = await Tezos.wallet.at(dexAddress);
    const dexStorage: any = await dexContract.storage();
    const { xtzPool, tokenPool } = dexStorage;

    const result = calculateLqtOutput({
      lqTokens: invData.balance,
      xtzPool,
      tokenPool,
      lqtTotal: total_supply.toNumber(),
      tokenDecimal: store.tokens[invData.icons[1]].decimals
    });
    if (result && !isNaN(result.xtz) && !isNaN(result.tokens)) {
      // TODO: use exchange rate from TezTools when it becomes available
      /*stakeInXtz =
      result.xtz +
      result.tokens * $store.tokens[invData.icons[1]].exchangeRate;*/
      stakeInXtz = result.xtz * 2;
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
