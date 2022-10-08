import type { TezosToolkit } from "@taquito/taquito";
import { encodeExpr } from "@taquito/utils";
import { Parser } from "@taquito/michel-codec";
import { Result } from "@swan-io/boxed";
import type { AvailableInvestment, TezosContractAddress } from "../types";
import type Token from "../Token";
import { lqtOutput } from "../utils";

const spicyDexAddress = "KT1PwoZxyv4XkPEGnTqWYvjA1UYiPTgAGyqL";

const getSpicyLptPrice = async ({
  tokens,
  Tezos
}: {
  tokens: Array<Token>;
  Tezos: TezosToolkit;
}): Promise<Result<number, string>> => {
  const parser = new Parser();
  const micheline = `(Pair (Pair "${tokens[1].address}" (${
    tokens[1].type === "fa1.2" ? "None" : "Some " + tokens[1].tokenId
  })) (Pair "${tokens[0].address}" (${
    tokens[0].type === "fa1.2" ? "None" : "Some " + tokens[0].tokenId
  })))`;
  const key = parser.parseMichelineExpression(micheline);
  const value = parser.parseMichelineExpression(
    "(pair (pair (address %fa2_address) (option %token_id nat)) (pair (address %fa2_address) (option %token_id nat)))"
  );
  const packedKey = await Tezos.rpc.packData({ data: key, type: value });
  const res = await fetch(
    `https://api.tzkt.io/v1/bigmaps/${19539}/keys/${encodeExpr(
      packedKey.packed
    )}`
  );
  if (res && res.status === 200) {
    const data = await res.json();
    if (data.hasOwnProperty("value") && data.value.hasOwnProperty("contract")) {
      const contract = await Tezos.wallet.at(data.value.contract);
      const storage: any = await contract.storage();
      const totalSupply = await storage.assets.token_total_supply.get(0);
      const lp_token_decimal = 0;

      if (!totalSupply)
        return Result.Error("No token total supply for this Matter farm token");

      const token1Amount =
        (lqtOutput({
          lqTokens: 532202172389596,
          pool: storage.reserve0.toNumber(),
          lqtTotal: totalSupply,
          decimals: 0
        }) /
          10 ** tokens[1].decimals) *
        tokens[1].getExchangeRate();

      const token2Amount =
        (lqtOutput({
          lqTokens: 532202172389596,
          pool: storage.reserve1.toNumber(),
          lqtTotal: totalSupply,
          decimals: 0
        }) /
          10 ** tokens[0].decimals) *
        tokens[0].getExchangeRate();

      return Result.Ok(+(token1Amount + token2Amount).toFixed(2));
    } else {
      return Result.Error("No DEX address for this Matter farm");
    }
  } else {
    return Result.Error(
      "No data returned by the TzKT API for this Matter farm"
    );
  }
};

export const calcMatterStake = async (
  tokenData: Array<Token>,
  Tezos: TezosToolkit
): Promise<Result<number, string>> => {
  return await getSpicyLptPrice({
    tokens: tokenData,
    Tezos
  });
};
