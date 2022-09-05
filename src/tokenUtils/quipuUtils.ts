import { get } from "svelte/store";
import type { TezosToolkit } from "@taquito/taquito";
import type { InvestmentData, TezosAccountAddress, IconValue } from "../types";
import { Option, Result } from "@swan-io/boxed";
import { calculateLqtOutput } from "../utils";
import _store from "../store";

export const calcQuipuRewards = async (
  Tezos: TezosToolkit,
  invData: InvestmentData,
  farmId: number,
  userAddress: TezosAccountAddress
): Promise<Option<number>> => {
  const contract = await Tezos.wallet.at(invData.address);
  const storage: any = await contract.storage();
  const farmData = await storage.storage.farms.get(farmId);
  // console.log(farmData);
  const userData = await storage.storage.users_info.get({
    0: farmId,
    1: userAddress
  });

  const new_farm_reward =
    ((Date.now() - new Date(farmData.upd).getTime()) / 1000) *
    farmData.reward_per_second.toNumber();
  const updated_reward_per_share =
    farmData.reward_per_share.toNumber() +
    new_farm_reward / farmData.staked.toNumber();
  const pending =
    (userData.earned.toNumber() +
      userData.staked.toNumber() * updated_reward_per_share -
      userData.prev_earned.toNumber()) /
    1e18;

  if (!isNaN(pending)) {
    const availableRewards = (pending - pending * 0.0005) / 10 ** 6;
    return Option.Some(availableRewards);
  } else {
    return Option.None();
  }
};

export const calcQuipuStake = async (
  invData: InvestmentData,
  Tezos: TezosToolkit
): Promise<Result<number, string>> => {
  const store = get(_store);
  let stakeInXtz: number;

  if (invData.icons.length === 2) {
    const contract = await Tezos.wallet.at(
      invData.icons.includes("QUIPU" as IconValue)
        ? "KT1X3zxdTzPB9DgVzA3ad6dgZe9JEamoaeRy"
        : "KT1EtjRRCBC2exyCRXz8UfV7jz7svnkqi7di"
    );
    const storage: any = await contract.storage();
    const { tez_pool, token_pool, total_supply } = storage.storage;
    // XTZ-QUIPU LP token
    const output = calculateLqtOutput({
      lqTokens: invData.balance,
      xtzPool: tez_pool.toNumber(),
      tokenPool: token_pool.toNumber(),
      lqtTotal: total_supply.toNumber(),
      tokenDecimal:
        store.tokens[invData.icons[invData.icons[0] === "XTZ" ? 1 : 0]].decimals
    });
    if (output && !isNaN(output.xtz) && !isNaN(output.tokens)) {
      stakeInXtz =
        output.xtz +
        output.tokens * store.tokens[invData.icons[1]].getExchangeRate();
    }
  } else if (invData.icons.length === 1 && invData.icons[0] === "QUIPU") {
    // QUIPU LP token
    stakeInXtz = invData.balance * store.tokens.QUIPU.getExchangeRate();
  }

  if (stakeInXtz && !isNaN(stakeInXtz)) {
    return Result.Ok(stakeInXtz);
  } else {
    return Result.Error(
      `Stake in XTZ coudn't be computed for ${invData.alias}`
    );
  }
};
