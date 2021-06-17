import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { findDex, estimateTezInShares } from "@quipuswap/sdk";
import { get } from "svelte/store";
import store from "./store";
import type { TezosAccountAddress } from "./types";
import config from "./config";

const ctx: Worker = self as any;
const localStore = get(store);
let Tezos: TezosToolkit;
let rpcUrl: string;
let userAddress: TezosAccountAddress;

const loadInvestments = async (param: {
  rpcUrl: string;
  userAddress: TezosAccountAddress;
}) => {
  // finds user's balances in investment contracts
  rpcUrl = param.rpcUrl;
  userAddress = param.userAddress;
  Tezos = new TezosToolkit(rpcUrl);
  Tezos.setPackerProvider(new MichelCodecPacker());
  const results = await Promise.all(
    Object.entries(localStore.investments).map(async ([name, details]) => {
      const contract = await Tezos.wallet.at(
        details.address[localStore.network]
      );
      const storage: any = await contract.storage();
      if (
        [
          "PLENTY-XTZ-LP",
          "PLENTY-hDAO",
          "PLENTY-PLENTY",
          "PLENTY-ETHtz",
          "PLENTY-USDtz"
        ].includes(name)
      ) {
        const userData = await storage.balances.get(userAddress);
        if (userData) {
          const balance = userData.balance.toNumber();
          const info = [];
          const entries = userData.InvestMap.entries();
          for (let entry of entries) {
            info.push({
              amount: entry[1].amount.toNumber(),
              level: entry[1].level.toNumber()
            });
          }

          if (name === "PLENTY-XTZ-LP") {
            const dex = await findDex(Tezos, config.quipuswapFactories, {
              contract: localStore.tokens.PLENTY.address[localStore.network]
            });
            const dexStorage = await dex.contract.storage();
            const tezInShares = await estimateTezInShares(dexStorage, 1000000);

            return {
              name,
              balance,
              info,
              shareValueInTez: tezInShares.toNumber()
            };
          }

          return { name, balance, info };
        } else {
          return { name, balance: 0, info: undefined };
        }
      } else if (
        [
          "QUIPUSWAP-PLENTY",
          "QUIPUSWAP-KUSD",
          "QUIPUSWAP-USDtz",
          "QUIPUSWAP-ETHtz"
        ].includes(name)
      ) {
        const userData = await storage.storage.ledger.get(userAddress);
        if (userData) {
          return {
            name,
            balance: userData.balance.toNumber(),
            info: undefined
          };
        }
      }
    })
  );

  ctx.postMessage({ type: "investments", msg: results });
};

ctx.addEventListener("message", async e => {
  // removes current interval
  if (e.data.type === "init") {
    await loadInvestments(e.data.payload);
  }
});

ctx.postMessage("Investments worker ready");

export {};
