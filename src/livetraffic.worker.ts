import { TezosToolkit } from "@taquito/taquito";
import type {
  TezosContractAddress,
  InvestmentPlatform,
  AvailableToken
} from "./types";
import config from "./config";

const ctx: Worker = self as any;

let userAddress;
let data;

const findPlatform = (
  contractAddress: TezosContractAddress
): { type: "token" | "farm" | "vault" | "lb"; info: any } => {
  // TOKEN
  const isToken = Object.values(data.tokens).filter(
    (tk: any) => tk.address === contractAddress
  );
  if (isToken.length > 0) {
    // multiple tokens can have the same address with different token ids
    return {
      type: "token",
      info: { ids: isToken.map(tk => tk.id), type: isToken.map(tk => tk.type) }
    };
  }

  // FARM
  const isFarm = data.farms.filter(farm => farm.address === contractAddress);
  if (isFarm.length === 1) {
    return { type: "farm", info: isFarm[0].id };
  }

  // VAULT
  const isVault = data.vaults.filter(
    vault => vault.address === contractAddress
  );
  if (isVault.length === 1) {
    return { type: "vault", info: isVault[0].id };
  }

  // LB CONTRACT
  const isLB = data.lbDex.filter(contract => contract === contractAddress);
  if (isLB.length === 1) {
    return { type: "lb", info: undefined };
  }
};

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
            contractsToWatch.includes((content as any).destination)
          ) {
            console.log(
              `General op on contract ${(content as any).destination}`
            );
            console.log(tx.contents);
            console.log(findPlatform((content as any).destination));
          }
          // if connected user sent a transaction to a contract MTD is watching
          if (
            content.hasOwnProperty("source") &&
            content.hasOwnProperty("destination") &&
            contractsToWatch.includes((content as any).destination) &&
            (content as any).source === userAddress
          ) {
            console.log(`User op on contract ${(content as any).destination}`);
            console.log(tx.contents);
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
    data = e.data.payload;
    init([
      ...Object.values(data.tokens).map((tk: any) => tk.address),
      ...data.farms.map(farm => farm.address),
      ...data.vaults,
      ...data.lbDex
    ]);
  } else if (e.data.type === "new-user") {
    userAddress = e.data.payload;
  }
});

export {};
