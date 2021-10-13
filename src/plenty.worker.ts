import { getLPConversion, formatPlentyLpAmount } from "./utils";

const ctx: Worker = self as any;
let favoriteFarms: string[] = [];
let tokenDecimals;
let fetchInterval;
const plentyAddress = "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b";

const fetchData = async () => {
  const dataRes = await fetch(
    `https://api.teztools.io/v1/${plentyAddress}/price`
  );
  if (dataRes) {
    const data = await dataRes.json();
    const tokenPairs = data.pairs.filter(pair =>
      favoriteFarms.includes(pair.symbols)
    );
    // this step is to be removed when TezTools adds the total supply into their API
    const lpTokensData: any = await Promise.allSettled(
      tokenPairs.map(async pair => ({
        ...pair,
        totalSupply: await fetch(
          `https://api.tzkt.io/v1/contracts/${pair.address}/storage`
        )
          .then(res => res.json())
          .then(storage => +storage.totalSupply)
          .catch(_ => undefined)
      }))
    );
    const lpTokensStorages = lpTokensData
      .map(token => {
        if (token.status === "fulfilled") {
          return token.value;
        }
      })
      .filter(el => el);
    console.log(
      lpTokensStorages.map(storage => {
        const tokenPair = storage.symbols.replace("/", "-");
        const token1 =
          +storage.sides[0].pool * 10 ** tokenDecimals[storage.sides[0].symbol];
        const token2 =
          +storage.sides[1].pool * 10 ** tokenDecimals[storage.sides[1].symbol];

        return {
          ...storage,
          lptValue: getLPConversion(
            token1,
            token2,
            +storage.totalSupply,
            formatPlentyLpAmount(81.971, tokenPair)
          )
        };
      })
    );
  }
};

const init = async () => {
  if (favoriteFarms.length > 0) {
    await fetchData();
    fetchInterval = setInterval(fetchData, 60000 * 3);
  }
};

ctx.addEventListener("message", async e => {
  if (e.data.type === "init") {
    favoriteFarms = e.data.payload.favoriteFarms
      .filter(farm => farm.toLowerCase().includes("plenty"))
      .map(farm => farm.replace("-LP", "").replace("-", "/"));
    tokenDecimals = e.data.payload.tokenDecimals;
    init();
  } else if (e.data.type === "destroy") {
    clearInterval(fetchInterval);
  }
});

export {};
