import type { TezosToolkit } from "@taquito/taquito";
import { Parser } from "@taquito/michel-codec";
import BigNumber from "bignumber.js";
import { get } from "svelte/store";
import { Option, Result } from "@swan-io/boxed";
import _store from "../store";
import type {
  TezosContractAddress,
  AvailableToken,
  InvestmentData
} from "../types";
import { AvailableInvestment } from "../types";
import {
  estimateQuipuTezInShares,
  estimateQuipuTokenInShares,
  formatTokenAmount
} from "../utils";

export const calcTokenStakesInAlienFarm = async (param: {
  Tezos: TezosToolkit;
  amountOfTokens: number;
  tokens: {
    address: TezosContractAddress;
    tokenId: number;
    tokenType: "fa1.2" | "fa2";
  }[];
}): Promise<{ tokenAAmount: number; tokenBAmount: number } | null> => {
  const { Tezos, amountOfTokens, tokens } = param;
  const DEX_ACCURACY_QUOTIENT = 1e18;
  const shares = new BigNumber(amountOfTokens); // amount of QP tokens
  let ttDexContract = await Tezos.wallet.at(
    "KT1DqhpvkfyBySVR4KV8Yu3K3jGSmLy7PTbr"
  );
  // finds token ids
  const dexStorage: any = await ttDexContract.storage();
  const parser = new Parser();
  const micheline = `{ Pair (Pair (Pair "${tokens[0].address}" ${
    tokens[0].tokenId
  }) (Pair ${tokens[0].tokenType === "fa2" ? "(Right Unit)" : "(Left Unit)"} "${
    tokens[1].address
  }")) (Pair ${tokens[1].tokenId} ${
    tokens[1].tokenType === "fa2" ? "(Right Unit)" : "(Left Unit)"
  }) }`;
  //console.log(tokens, micheline);
  const key = parser.parseMichelineExpression(micheline);
  const value = parser.parseMichelineExpression(
    "(pair (pair (pair address nat) (pair (or unit unit) address)) (pair nat (or unit unit)))"
  );
  const packedKey = await Tezos.rpc.packData({ data: key[0], type: value });
  const qpTokenId = await dexStorage.storage.token_to_id.get(packedKey.packed);
  if (qpTokenId) {
    // finds shares
    const { token_a_pool, token_b_pool, total_supply } =
      await dexStorage.storage.pairs.get(qpTokenId.toNumber());
    // QP token has 6 decimals
    const tokenAAmount = shares
      .times(1e6)
      .times(token_a_pool)
      .idiv(total_supply)
      .idiv(DEX_ACCURACY_QUOTIENT); // should be divided if token A has some decimals
    const tokenBAmount = shares
      .times(1e6)
      .times(token_b_pool)
      .idiv(total_supply)
      .idiv(DEX_ACCURACY_QUOTIENT); // should be divided if token B has some decimals

    return {
      tokenAAmount: tokenAAmount.toNumber(),
      tokenBAmount: tokenBAmount.toNumber()
    };
  } else {
    return null;
  }
};

export const calcTokenStakesFromQuipu = async (param: {
  Tezos: TezosToolkit;
  id: AvailableInvestment;
  balance: number;
  paulToken: { decimals: number; exchangeRate: number };
}) => {
  let { Tezos, id, balance, paulToken } = param;

  let dexAddress = "";
  let stakeInXtz = null;
  if (id === "PAUL-XTZ") {
    dexAddress = "KT1K8A8DLUTVuHaDBCZiG6AJdvKJbtH8dqmN";
  } else if (id === "MAG-XTZ") {
    dexAddress = "KT1WREc3cpr36Nqjvegr6WSPgQKwDjL7XxLN";
  }

  if (!dexAddress) {
    return null;
  }

  const tezInStakesRaw = await estimateQuipuTezInShares(
    Tezos,
    dexAddress,
    balance
  );
  const tezInStakes = tezInStakesRaw.toNumber() / 10 ** 6;
  const tokensInStakesRaw = await estimateQuipuTokenInShares(
    Tezos,
    dexAddress,
    balance
  );
  const tokensInStakes =
    (tokensInStakesRaw.toNumber() / 10 ** paulToken.decimals) *
    paulToken.exchangeRate;

  return formatTokenAmount(tezInStakes + tokensInStakes);
};

export const calcPaulFarmApr = async ({
  Tezos,
  farmId,
  farmAddress,
  earnCoinPrice,
  tokenDecimals,
  paulPrice
}: {
  Tezos: TezosToolkit;
  farmId: AvailableInvestment;
  farmAddress: TezosContractAddress;
  earnCoinPrice: number;
  tokenDecimals: number;
  paulPrice: number;
}): Promise<Result<number, string>> => {
  const localStore = get(_store);

  const contract = await Tezos.wallet.at(farmAddress);
  const storage: any = await contract.storage();
  // TODO: calculate the price for the LP token
  let lpTokenPrice: null | number;
  switch (farmId) {
    case AvailableInvestment["PAUL-PAUL"]:
      lpTokenPrice = paulPrice / 10 ** 4;
      break;
    case AvailableInvestment["PAUL-XTZ"]:
    case AvailableInvestment["MAG-XTZ"]:
      lpTokenPrice = await calcTokenStakesFromQuipu({
        Tezos,
        id: farmId,
        balance: 10 ** 4,
        paulToken: { decimals: tokenDecimals, exchangeRate: paulPrice }
      });
      break;
    case AvailableInvestment["wWBTC-PAUL"]:
    case AvailableInvestment["wUSDC-PAUL"]:
    case AvailableInvestment["QUIPU-PAUL"]:
    case AvailableInvestment["wWETH-PAUL"]:
    case AvailableInvestment["PAUL-uUSD"]:
    case AvailableInvestment["PAUL-kUSD-uUSD"]:
      const invData = localStore.investments[farmId];
      const { tokenAAmount, tokenBAmount } = await calcTokenStakesInAlienFarm({
        Tezos,
        amountOfTokens: 10 ** 4,
        tokens: invData.icons.map(icon => {
          const {
            address,
            tokenId = 0,
            type
          } = localStore.tokens[icon as AvailableToken];
          return {
            address,
            tokenId,
            tokenType: type
          };
        })
      });
      if (farmId === AvailableInvestment["PAUL-kUSD-uUSD"]) {
        lpTokenPrice =
          (((tokenAAmount / 10 ** localStore.tokens.kUSD.decimals) *
            localStore.tokens.kUSD.getExchangeRate()) /
            10 ** 6) *
          2;
      } else if (invData.icons[0] === "PAUL") {
        lpTokenPrice =
          (((tokenAAmount / 10 ** localStore.tokens.PAUL.decimals) *
            localStore.tokens.PAUL.getExchangeRate()) /
            10 ** 6) *
          2;
      } else {
        lpTokenPrice =
          (((tokenBAmount / 10 ** localStore.tokens.PAUL.decimals) *
            localStore.tokens.PAUL.getExchangeRate()) /
            10 ** 6) *
          2;
      }
      break;
    default:
      console.info(`Unhandled case for PAUL farm ${farmId}`);
      lpTokenPrice = null;
  }

  if (lpTokenPrice) {
    const earnCoinsPerYear =
      (((storage.reward_per_second * storage.coefficient) / 100) *
        24 *
        3600 *
        365) /
      10 ** tokenDecimals;
    const totalStakedInUsd = (storage.total_staked / 10 ** 6) * lpTokenPrice;

    return Result.Ok(
      (((earnCoinPrice * earnCoinsPerYear) / totalStakedInUsd) * 100) / 100
    );
  } else {
    return Result.Error("No LPT price found");
  }
  /*
    For farming: earnCoinPrice * earnCoinsPerYear / totalStakedInUsd * 100%, 
    where earnCoinPrice -  the price of one reward token, 
    earnCoinsPerYear = reward_per_second * coefficient / 100 * 24 * 3600 * 365 / (10  tokenDecimals), 
    totalStakedInUsd = total_staked / (10  6) * lpTokenPrice
  */
};

export const getPaulReward = async (
  contractAddress: string,
  vaultMode?: boolean
): Promise<BigNumber | null> => {
  const localStore = get(_store);
  const numberAccuracy = new BigNumber(1000000000000000000);

  const contract = await localStore.Tezos.wallet.at(contractAddress);
  const storage: any = await contract.storage();
  const {
    last_updated: lastUpdated,
    share_reward: shareReward,
    total_staked: totalStaked,
    account_info: accountInfo,
    reward_per_second: rewardPerSecond,
    coefficient,
    referral_system: referralSystem
  } = storage;

  if (totalStaked.eq(0)) {
    return new BigNumber(0);
  }

  const referralSystemContract = await localStore.Tezos.wallet.at(
    referralSystem
  );
  const { commission } = (await referralSystemContract.storage()) as any;

  const currentTime = new BigNumber(+new Date());
  const lastTime = new BigNumber(+new Date(lastUpdated));
  const time = currentTime.minus(lastTime).idiv(1000).abs();

  const newReward = time
    .times(rewardPerSecond.times(coefficient))
    .times(numberAccuracy);
  const newShareReward = new BigNumber(shareReward).plus(
    newReward.idiv(totalStaked).idiv(100)
  );

  const val = await accountInfo.get(localStore.userAddress);
  if (!val) return null;

  const reward = val.reward
    .plus(val.amount.times(newShareReward).minus(val.former))
    .idiv(numberAccuracy);

  // There is no commission for vaults
  if (vaultMode) {
    return reward;
  }

  const result = reward.times(new BigNumber(100).minus(commission)).idiv(100);

  if (result.toNumber() < 0) {
    return new BigNumber(0);
  } else {
    return result;
  }
};

export const calcPaulRewards = async (
  invData: InvestmentData
): Promise<Option<number>> => {
  const store = get(_store);

  const rewardsRes = await getPaulReward(invData.address);
  if (rewardsRes) {
    return Option.Some(
      rewardsRes.toNumber() / 10 ** store.tokens.PAUL.decimals
    );
  } else {
    return Option.None();
  }
};

export const calcPaulStake = async (
  invData: InvestmentData,
  Tezos: TezosToolkit
): Promise<Result<number, string>> => {
  let stakeInXtz: number;
  let store = get(_store);

  if (invData.id === "PAUL-XTZ" || invData.id === "MAG-XTZ") {
    stakeInXtz = await calcTokenStakesFromQuipu({
      Tezos: Tezos,
      id: invData.id,
      balance: invData.balance,
      paulToken: {
        decimals: store.tokens.PAUL.decimals,
        exchangeRate: store.tokens.PAUL.getExchangeRate()
      }
    });
  } else if (invData.id === "PAUL-PAUL") {
    stakeInXtz = formatTokenAmount(
      (invData.balance / 10 ** invData.decimals) *
        store.tokens.PAUL.getExchangeRate()
    );
  } else {
    stakeInXtz = null;
  }

  if (invData.info?.includes("paul-lqt")) {
    const shares = await calcTokenStakesInAlienFarm({
      Tezos,
      amountOfTokens: invData.balance,
      tokens: invData.icons.map(icon => {
        const {
          address,
          tokenId = 0,
          type
        } = store.tokens[icon as AvailableToken];
        return {
          address,
          tokenId,
          tokenType: type
        };
      })
    });
    if (shares) {
      const token1InXtz =
        ((shares.tokenAAmount / 10 ** store.tokens[invData.icons[0]].decimals) *
          store.tokens[invData.icons[0]].getExchangeRate()) /
        10 ** 6;
      const token2InXtz =
        ((shares.tokenBAmount / 10 ** store.tokens[invData.icons[1]].decimals) *
          store.tokens[invData.icons[1]].getExchangeRate()) /
        10 ** 6;
      stakeInXtz = formatTokenAmount(token1InXtz + token2InXtz);
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
