import type { TezosToolkit } from "@taquito/taquito";
import { Parser } from "@taquito/michel-codec";
import BigNumber from "bignumber.js";
import type { TezosContractAddress } from "./types";

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
  //console.log(micheline, key[0], value);
  const packedKey = await Tezos.rpc.packData({ data: key[0], type: value });
  const qpTokenId = await dexStorage.storage.token_to_id.get(packedKey.packed);
  if (qpTokenId) {
    // finds shares
    const ttDexStorage: any = await ttDexContract.storage();
    const { token_a_pool, token_b_pool, total_supply } =
      await ttDexStorage.storage.pairs.get(qpTokenId.toNumber());
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
