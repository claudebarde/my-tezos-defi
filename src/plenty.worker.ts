import { HubConnectionBuilder } from "@microsoft/signalr";

const ctx: Worker = self as any;
let contractsToWatch: [string, string][] = [];

const connection = new HubConnectionBuilder()
  .withUrl("https://api.tzkt.io/v1/events")
  .build();

const init = async () => {
  // open connection
  await connection.start();
  // subscribe to account transactions
  await Promise.allSettled(
    contractsToWatch.map((_, address) =>
      connection.invoke("SubscribeToOperations", {
        address: address,
        types: "transaction"
      })
    )
  );
  // auto-reconnect
  connection.onclose(init);

  connection.on("operations", msg => {
    console.log(msg);
    if (msg.type !== 0) {
      ctx.postMessage({ type: "plenty-dex-op", payload: msg.data });
    }
  });
};

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    contractsToWatch = [...e.data.payload];
    await init();
  }
});

export {};
