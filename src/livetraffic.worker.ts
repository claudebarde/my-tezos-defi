import { HubConnectionBuilder } from "@microsoft/signalr";
import { get } from "svelte/store";
import store from "./store";
import type { State } from "./types";

const ctx: Worker = self as any;
let tokens: State["tokens"];
let addresses = [];

const connection = new HubConnectionBuilder()
  .withUrl("https://api.tzkt.io/v1/events")
  .build();

async function init() {
  const localStore = get(store);
  if (tokens) {
    addresses = [
      ...addresses,
      ...Object.values(tokens).map(token => token.address)
    ];
  }
  if (localStore.investments) {
    addresses = [
      ...addresses,
      ...Object.values(localStore.investments).map(entry => entry.address)
    ];
  }
  // open connection
  await connection.start();
  // subscribe to account transactions
  await Promise.all(
    addresses.map(address =>
      connection.invoke("SubscribeToOperations", {
        address: address,
        types: "transaction"
      })
    )
  );
  // returns the operations of the last 5 blocks
  const headResponse = await fetch("https://api.mainnet.tzkt.io/v1/head");
  if (headResponse) {
    const head = await headResponse.json();
    const currentLevel = head.level;
    const lastTxsResponse = await fetch(
      `https://api.mainnet.tzkt.io/v1/operations/transactions?level.ge=${
        currentLevel - 5
      }&target.in=${addresses.join(",")}`
    );
    if (lastTxsResponse) {
      const lastTxs = await lastTxsResponse.json();
      ctx.postMessage({ type: "init-last-ops", msg: lastTxs });
    }
  }
}

// auto-reconnect
connection.onclose(init);

connection.on("operations", msg => {
  if (msg.type !== 0) {
    ctx.postMessage({ type: "live-traffic", msg: msg.data });
  }
});

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    tokens = e.data.payload;
    await init();
  }
});

export {};
