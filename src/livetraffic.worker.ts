import { TezosToolkit } from "@taquito/taquito";
import type { TezosContractAddress } from "./types";
import config from "./config";

const ctx: Worker = self as any;

let userAddress;

const init = (contractsToWatch: Array<TezosContractAddress>) => {
  const Tezos = new TezosToolkit(config.rpcUrl);
  const subscriber = Tezos.stream.subscribe("head");
  subscriber.on("data", async blockHash => {
    const block = await Tezos.rpc.getBlock({ block: blockHash });
    console.log("New block:", block.hash);
    ctx.postMessage({ type: "new-level", payload: block.header.level });
    // looks for transactions in DeFi contracts
    const transactions = block.operations[3];
    transactions.forEach(tx => {
      if (
        tx.hasOwnProperty("contents") &&
        Array.isArray(tx.contents) &&
        tx.contents.length > 0
      ) {
        tx.contents.forEach(content => {
          // if watched contract receive a transaction from another user
          if (
            content.hasOwnProperty("source") &&
            content.hasOwnProperty("destination") &&
            contractsToWatch.includes((content as any).destination) &&
            (content as any).source !== userAddress
          ) {
            //console.log(`General op on contract ${(content as any).destination}`);
          }
          // if connected user sent a transaction to a contract MTD is watching
          if (
            content.hasOwnProperty("source") &&
            content.hasOwnProperty("destination") &&
            contractsToWatch.includes((content as any).destination) &&
            (content as any).source === userAddress
          ) {
            console.log(`User op on contract ${(content as any).destination}`);
          }
        });
      }
    });
  });
  subscriber.on("error", err => {
    console.error(err);
  });
  subscriber.off("error", err => {
    console.error("Taquito subscriber error:", err);
  });
  subscriber.on("close", () => {
    console.log("Taquito subscriber closed");
  });
};

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    console.log("init from worker");
    init(e.data.payload);
  } else if (e.data.type === "new-user") {
    userAddress = e.data.payload;
  }
});

export {};
