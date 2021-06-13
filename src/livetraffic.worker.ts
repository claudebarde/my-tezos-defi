import { HubConnectionBuilder } from "@microsoft/signalr";
import { get } from "svelte/store";
import store from "./store";

const ctx: Worker = self as any;
const localStore = get(store);
const addresses = [
  ...Object.values(localStore.tokens).map(
    token => token.address[localStore.network]
  ),
  ...Object.values(localStore.investments).map(
    entry => entry.address[localStore.network]
  )
];

const connection = new HubConnectionBuilder()
  .withUrl("https://api.tzkt.io/v1/events")
  .build();

async function init() {
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
}

// auto-reconnect
connection.onclose(init);

connection.on("operations", msg => {
  if (msg.type !== 0) {
    ctx.postMessage({ type: "live-traffic", msg: msg.data });
  }
});

init();

ctx.postMessage("Live traffic worker ready");

export {};
