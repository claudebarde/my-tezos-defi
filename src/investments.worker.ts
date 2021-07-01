import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { findDex, estimateTezInShares } from "@quipuswap/sdk";
import type { Token } from "@quipuswap/sdk";
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
      // PLENTY FARMS/POOLS
      if (
        [
          "PLENTY-XTZ-LP",
          "PLENTY-hDAO",
          "PLENTY-PLENTY",
          "PLENTY-ETHtz",
          "PLENTY-USDtz",
          "PLENTY-KALAM"
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
        // QUIPUSWAP POOLS
        const userData = await storage.storage.ledger.get(userAddress);
        if (userData) {
          return {
            name,
            balance: userData.balance.toNumber(),
            info: undefined
          };
        }
      } else if (name === "CRUNCHY-FARMS") {
        const nrOfFarms = 3; //storage.nextFarmId.toNumber();

        /*const balances = await storage.ledger.getMultipleValues(
          Array.from(Array(nrOfFarms).keys()).map(farmId => ({
            0: farmId,
            1: userAddress
          }))
        );*/
        /*const balance = await storage.ledger.get({
          nat: "0",
          address: userAddress
        });*/

        const request = `https://api.tzkt.io/v1/bigmaps/4874/keys?active=true&key.in=[${Array.from(
          Array(nrOfFarms).keys()
        )
          .map(farmId =>
            JSON.stringify({
              nat: farmId.toString(),
              address: userAddress
            })
          )
          .join(",")}]`;

        const valuesResponse = await fetch(request);
        if (valuesResponse) {
          const values = await valuesResponse.json();
          if (values.length === 0) {
            return undefined;
          } else {
            const shareValuesInTez: any = await Promise.all(
              values.map(async val => {
                const farmId = +val.key.nat;

                let token: Token;
                let one_token: number;
                switch (farmId) {
                  case 0:
                    // CRUNCH
                    token = {
                      contract:
                        localStore.tokens.CRUNCH.address[localStore.network],
                      id: 0
                    };
                    one_token = 10 ** localStore.tokens.CRUNCH.decimals;
                    break;
                  case 1:
                    // kUSD
                    token = {
                      contract:
                        localStore.tokens.kUSD.address[localStore.network],
                      id: 0
                    };
                    one_token = 10 ** localStore.tokens.kUSD.decimals;
                    break;
                  case 2:
                    // wWBTV
                    token = {
                      contract:
                        localStore.tokens.wWBTC.address[localStore.network],
                      id: 19
                    };
                    one_token = 10 ** localStore.tokens.wWBTC.decimals;
                    break;
                }
                if (token) {
                  const dex = await findDex(
                    Tezos,
                    config.quipuswapFactories,
                    token
                  );
                  const dexStorage = await dex.contract.storage();
                  return estimateTezInShares(dexStorage, one_token);
                }
              })
            );

            return {
              name,
              balance: 0,
              info: [
                ...values.map((val, i) => ({
                  farmId: val.key.nat,
                  amount: val.value.amount,
                  shareValueInTez: shareValuesInTez[i].toNumber()
                }))
              ]
            };
          }
        } else {
          return undefined;
        }

        // https://api.tzkt.io/v1/bigmaps/4874/keys/{"nat":"0","address":"tz1Me1MGhK7taay748h4gPnX2cXvbgL6xsYL"}
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
