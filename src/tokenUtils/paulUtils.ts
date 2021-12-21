import type { TezosToolkit } from "@taquito/taquito";
import { Parser } from "@taquito/michel-codec";
import BigNumber from "bignumber.js";
import { get } from "svelte/store";
import store from "../store";
import type { TezosContractAddress, AvailableToken } from "../types";
import { AvailableInvestments } from "../types";
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
  id: AvailableInvestments;
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
  farmId: AvailableInvestments;
  farmAddress: TezosContractAddress;
  earnCoinPrice: number;
  tokenDecimals: number;
  paulPrice: number;
}): Promise<number | null> => {
  const localStore = get(store);

  const contract = await Tezos.wallet.at(farmAddress);
  const storage: any = await contract.storage();
  // TODO: calculate the price for the LP token
  let lpTokenPrice: null | number;
  switch (farmId) {
    case AvailableInvestments["PAUL-PAUL"]:
      lpTokenPrice = paulPrice / 10 ** 4;
      break;
    case AvailableInvestments["PAUL-XTZ"]:
    case AvailableInvestments["MAG-XTZ"]:
      lpTokenPrice = await calcTokenStakesFromQuipu({
        Tezos,
        id: farmId,
        balance: 10 ** 4,
        paulToken: { decimals: tokenDecimals, exchangeRate: paulPrice }
      });
      break;
    case AvailableInvestments["wWBTC-PAUL"]:
    case AvailableInvestments["wUSDC-PAUL"]:
    case AvailableInvestments["QUIPU-PAUL"]:
    case AvailableInvestments["wWETH-PAUL"]:
    case AvailableInvestments["PAUL-uUSD"]:
      const invData = localStore.investments[farmId];
      const { tokenAAmount, tokenBAmount } = await calcTokenStakesInAlienFarm({
        Tezos,
        amountOfTokens: 10 ** 4,
        tokens: invData.icons.map(icon => ({
          address: localStore.tokens[icon as AvailableToken].address,
          tokenId: localStore.tokens[icon as AvailableToken].tokenId,
          tokenType: localStore.tokens[icon as AvailableToken].type
        }))
      });
      if (invData.icons[0] === "PAUL") {
        lpTokenPrice =
          (((tokenAAmount / 10 ** localStore.tokens.PAUL.decimals) *
            localStore.tokens.PAUL.exchangeRate) /
            10 ** 6) *
          2;
      } else {
        lpTokenPrice =
          (((tokenBAmount / 10 ** localStore.tokens.PAUL.decimals) *
            localStore.tokens.PAUL.exchangeRate) /
            10 ** 6) *
          2;
      }
      break;
    default:
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

    return (
      (((earnCoinPrice * earnCoinsPerYear) / totalStakedInUsd) * 100) / 100
    );
  } else {
    return null;
  }
  /*
    For farming: earnCoinPrice * earnCoinsPerYear / totalStakedInUsd * 100%, 
    where earnCoinPrice -  the price of one reward token, 
    earnCoinsPerYear = reward_per_second * coefficient / 100 * 24 * 3600 * 365 / (10  tokenDecimals), 
    totalStakedInUsd = total_staked / (10  6) * lpTokenPrice
  */
};
