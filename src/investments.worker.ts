const ctx: Worker = self as any;

const init = async contractAddresses => {
  //console.log("init:", contractAddresses);
};

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    await init(e.data.payload);
  }
});

ctx.postMessage("Investments worker ready");

export {};
