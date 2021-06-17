import type { HistoricalDataState, AvailableToken } from "./types";

// outputs "down" while visually looking like "up"
const testUpsAndDownsData = [
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 },
  { direction: "up", diff: 0.02668999999999999 },
  { direction: "down", diff: 0.00008000000000008001 },
  { direction: "down", diff: 0.00002999999999997449 },
  { direction: "down", diff: 0.00002999999999997449 },
  { direction: "same", diff: 0 },
  { direction: "same", diff: 0 }
];

export const calculateTrend = (
  historicalData: HistoricalDataState,
  tokenSymbol: AvailableToken
) => {
  let trend: "same" | "up" | "down", nrOfTrends: number;
  // calculates new trend
  const tokenData = historicalData.tokens[tokenSymbol];
  tokenData.sort((a, b) => a.timestamp - b.timestamp);
  const upsAndDowns = tokenData.map((el, index) => {
    if (index === 0) {
      // first element of the array, nothing to do with it
      return { direction: "same", diff: 0 };
    } else {
      const previousEl = tokenData[index - 1];
      if (+el.rate.tokenToTez === +previousEl.rate.tokenToTez) {
        return { direction: "same", diff: 0 };
      } else if (+el.rate.tokenToTez > +previousEl.rate.tokenToTez) {
        // price went up
        return {
          direction: "up",
          diff: +el.rate.tokenToTez - +previousEl.rate.tokenToTez
        };
      } else {
        return {
          direction: "down",
          diff: +previousEl.rate.tokenToTez - +el.rate.tokenToTez
        };
      }
    }
  });
  //console.log(tokenSymbol, JSON.stringify(upsAndDowns));
  /*const counts = upsAndDowns.reduce(
    (prev, cur) => {
      prev[cur.direction] = (prev[cur.direction] || 0) + 1;
      return prev;
    },
    { up: 0, down: 0, same: 0 }
  );*/
  let diffUp = 0;
  let diffDown = 0;
  upsAndDowns.forEach(val => {
    if (val.direction === "up") {
      diffUp += +val.diff;
    } else if (val.direction === "down") {
      diffDown += +val.diff;
    }
  });

  if (diffUp === diffDown) {
    trend = "same";
  } else if (diffUp > diffDown) {
    trend = "up";
  } else {
    trend = "down";
  }
  nrOfTrends = historicalData.tokens[tokenSymbol].length;
  /*console.log(
          token[0],
          historicalData.tokens[token[0]],
          upsAndDowns,
          counts,
          trend
        );*/

  return { trend, nrOfTrends };
};

export const shortenHash = (hash: string): string =>
  hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";
