import { TezosToolkit } from "@taquito/taquito";
import config from "../../config";
import type { AvailableToken } from "../../types";
import type Token from "../../Token";
import { calcKdaoRewards, calcKdaoStake } from "../../tokenUtils/kdaoUtils";
import { calcPaulRewards, calcPaulStake } from "../../tokenUtils/paulUtils";
import {
  calcPlentyRewards,
  calcPlentyStake
} from "../../tokenUtils/plentyUtils";
import { calcQuipuRewards, calcQuipuStake } from "../../tokenUtils/quipuUtils";
import {
  calcSmartlinkRewards,
  calcSmartlinkStake
} from "../../tokenUtils/smartlinkUtils";
import { calcWrapRewards, calcWrapStake } from "../../tokenUtils/wrapUtils";
import {
  calcYouvesRewards,
  calcYouvesStake
} from "../../tokenUtils/youvesUtils";

const ctx: Worker = self as any;

let Tezos: TezosToolkit;
let tokens: { [p in AvailableToken]: Token };

const init = () => {
  Tezos = new TezosToolkit(config.rpcUrl);
};

const calcStake = async (invData, userAddress) => {
  let stakeInXtz: number;

  switch (invData.platform) {
    case "kdao":
      const kdaoStake = await calcKdaoStake(invData, Tezos);
      kdaoStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
    case "paul":
      const paulStake = await calcPaulStake(invData, Tezos);
      paulStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
    case "plenty":
      const plentyStake = await calcPlentyStake(invData, tokens);
      plentyStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
    case "quipuswap":
      const quipuStake = await calcQuipuStake(invData, Tezos);
      quipuStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
    case "smartlink":
      const smartlinkStake = await calcSmartlinkStake(Tezos, invData);
      smartlinkStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
    case "wrap":
      const wrapStake = await calcWrapStake(invData, Tezos);
      wrapStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
    case "youves":
      const youvesStake = await calcYouvesStake(invData, Tezos, userAddress);
      youvesStake.match({
        Ok: val => {
          stakeInXtz = val;
          return;
        },
        Error: err => console.error(err)
      });
      break;
  }

  console.log({ stakeInXtz });
};

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    tokens = e.data.payload;
    init();
  } else if (e.data.type === "update-tokens") {
    console.log("update tokens");
  } else if (e.data.type === "calc-stake") {
    calcStake(e.data.payload.invData, e.data.payload.userAddress);
  } else if (e.data.type === "calc-rewards") {
    console.log("calc-rewards");
  }
});

export {};
