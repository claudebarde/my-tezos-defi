const ctx: Worker = self as any;
let favoriteFarms: string[] = [];
let fetchInterval;
const plentyAddress = "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b";

const fetchData = async () => {
  /*const dataRes = await fetch(
    `https://api.teztools.io/v1/${plentyAddress}/price`
  );
  if (dataRes) {
    const data = await dataRes.json();
    const tokenPairs = data.pairs.filter(pair =>
      favoriteFarms.includes(pair.symbols)
    );
    console.log(tokenPairs);
  }*/
};

const init = async () => {
  await fetchData();
  fetchInterval = setInterval(fetchData, 60000 * 3);
};

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    favoriteFarms = e.data.payload.favoriteFarms
      .filter(farm => farm.toLowerCase().includes("plenty"))
      .map(farm => farm.replace("-LP", "").replace("-", "/"));
    init();
  } else if (e.data.type === "destroy") {
    clearInterval(fetchInterval);
  }
});

export {};
