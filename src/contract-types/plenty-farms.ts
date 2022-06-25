import type * as functolib from "./functolib";

export type type1 = { level: functolib.nat; amount: functolib.nat };

export type type2 = {
  userRewardPerTokenPaid: functolib.nat;
  rewards: functolib.nat;
  counter: functolib.nat;
  balance: functolib.nat;
  investMap: functolib.map<functolib.nat, type1>;
};

export type plentyFarmStorage = {
  unstakeFee: functolib.map<functolib.nat, functolib.nat>;
  totalSupply: functolib.nat;
  totalFee: functolib.nat;
  stakeToken: functolib.address;
  rewardToken: functolib.address;
  rewardRate: functolib.nat;
  rewardPerTokenStored: functolib.nat;
  periodFinish: functolib.nat;
  paused: functolib.bool;
  lastUpdateTime: functolib.nat;
  faTwoToken: functolib.bool;
  defaultUnstakeFee: functolib.nat;
  blocksPerCycle: functolib.nat;
  balances: functolib.big_map<functolib.address, type2>;
  admin: functolib.address;
};
