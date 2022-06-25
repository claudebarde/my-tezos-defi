import type {
  TezosToolkit,
  BigMapAbstraction,
  MichelsonMap,
  OriginationOperation,
  OpKind,
  createTransferOperation,
  TransferParams,
  RPCOperation,
  createRevealOperation
} from "@taquito/taquito";
import type { MichelsonV1Expression } from "@taquito/rpc";
import { encodeOpHash } from "@taquito/utils";
import { Parser } from "@taquito/michel-codec";
import { stringify } from "querystring";

import * as functolib from "./functolib";

let plentyFarmStd_code = require("./plenty-farm-std_code.json");

export type type1 = { level: functolib.nat; amount: functolib.nat };
export type initial_type1 = { level: functolib.nat; amount: functolib.nat };
export function type1_encode(arg: type1): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [functolib.nat_encode(arg.amount), functolib.nat_encode(arg.level)]
  };
}
export function type1_decode(arg: MichelsonV1Expression): type1 {
  let before_projection = functolib.tuple2_decode(
    functolib.nat_decode,
    functolib.nat_decode
  )(arg);
  return {
    amount: before_projection[0],
    level: before_projection[1]
  };
}

export type type2 = {
  userRewardPerTokenPaid: functolib.nat;
  rewards: functolib.nat;
  counter: functolib.nat;
  balance: functolib.nat;
  investMap: functolib.map<functolib.nat, type1>;
};
export type initial_type2 = {
  userRewardPerTokenPaid: functolib.nat;
  rewards: functolib.nat;
  counter: functolib.nat;
  balance: functolib.nat;
  investMap: MichelsonMap<any, any>;
};
export function type2_encode(arg: type2): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [
      {
        prim: "Pair",
        args: [
          functolib.map_encode(
            functolib.nat_encode,
            type1_encode
          )(arg.investMap),
          functolib.nat_encode(arg.balance)
        ]
      },
      functolib.nat_encode(arg.counter),
      functolib.nat_encode(arg.rewards),
      functolib.nat_encode(arg.userRewardPerTokenPaid)
    ]
  };
}
export function type2_decode(arg: MichelsonV1Expression): type2 {
  let before_projection = functolib.tuple4_decode(
    functolib.tuple2_decode(
      functolib.map_decode(functolib.nat_decode, type1_decode),
      functolib.nat_decode
    ),
    functolib.nat_decode,
    functolib.nat_decode,
    functolib.nat_decode
  )(arg);
  return {
    investMap: before_projection[0][0],
    balance: before_projection[0][1],
    counter: before_projection[1],
    rewards: before_projection[2],
    userRewardPerTokenPaid: before_projection[3]
  };
}

export type storage = {
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
export type initial_storage = {
  unstakeFee: MichelsonMap<any, any>;
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
  balances: MichelsonMap<any, any>;
  admin: functolib.address;
};
export function storage_encode(arg: storage): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [
      {
        prim: "Pair",
        args: [
          {
            prim: "Pair",
            args: [
              functolib.address_encode(arg.admin),
              functolib.big_map_encode(
                functolib.address_encode,
                type2_encode
              )(arg.balances),
              functolib.nat_encode(arg.blocksPerCycle)
            ]
          },
          {
            prim: "Pair",
            args: [
              functolib.nat_encode(arg.defaultUnstakeFee),
              functolib.bool_encode(arg.faTwoToken)
            ]
          },
          functolib.nat_encode(arg.lastUpdateTime),
          functolib.bool_encode(arg.paused)
        ]
      },
      {
        prim: "Pair",
        args: [
          {
            prim: "Pair",
            args: [
              functolib.nat_encode(arg.periodFinish),
              functolib.nat_encode(arg.rewardPerTokenStored)
            ]
          },
          functolib.nat_encode(arg.rewardRate),
          functolib.address_encode(arg.rewardToken)
        ]
      },
      {
        prim: "Pair",
        args: [
          functolib.address_encode(arg.stakeToken),
          functolib.nat_encode(arg.totalFee)
        ]
      },
      functolib.nat_encode(arg.totalSupply),
      functolib.map_encode(
        functolib.nat_encode,
        functolib.nat_encode
      )(arg.unstakeFee)
    ]
  };
}
export function storage_decode(arg: MichelsonV1Expression): storage {
  let before_projection = functolib.tuple5_decode(
    functolib.tuple4_decode(
      functolib.tuple3_decode(
        functolib.address_decode,
        functolib.big_map_decode(functolib.address_decode, type2_decode),
        functolib.nat_decode
      ),
      functolib.tuple2_decode(functolib.nat_decode, functolib.bool_decode),
      functolib.nat_decode,
      functolib.bool_decode
    ),
    functolib.tuple3_decode(
      functolib.tuple2_decode(functolib.nat_decode, functolib.nat_decode),
      functolib.nat_decode,
      functolib.address_decode
    ),
    functolib.tuple2_decode(functolib.address_decode, functolib.nat_decode),
    functolib.nat_decode,
    functolib.map_decode(functolib.nat_decode, functolib.nat_decode)
  )(arg);
  return {
    admin: before_projection[0][0][0],
    balances: before_projection[0][0][1],
    blocksPerCycle: before_projection[0][0][2],
    defaultUnstakeFee: before_projection[0][1][0],
    faTwoToken: before_projection[0][1][1],
    lastUpdateTime: before_projection[0][2],
    paused: before_projection[0][3],
    periodFinish: before_projection[1][0][0],
    rewardPerTokenStored: before_projection[1][0][1],
    rewardRate: before_projection[1][1],
    rewardToken: before_projection[1][2],
    stakeToken: before_projection[2][0],
    totalFee: before_projection[2][1],
    totalSupply: before_projection[3],
    unstakeFee: before_projection[4]
  };
}

export type type0 = { mapKey: functolib.nat; amount: functolib.nat };
export type initial_type0 = { mapKey: functolib.nat; amount: functolib.nat };
export function type0_encode(arg: type0): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [functolib.nat_encode(arg.amount), functolib.nat_encode(arg.mapKey)]
  };
}
export function type0_decode(arg: MichelsonV1Expression): type0 {
  let before_projection = functolib.tuple2_decode(
    functolib.nat_decode,
    functolib.nat_decode
  )(arg);
  return {
    amount: before_projection[0],
    mapKey: before_projection[1]
  };
}

export type unstake = type0;
export type initial_unstake = type0;

export function unstake_encode(arg: unstake): MichelsonV1Expression {
  return type0_encode(arg);
}

export function unstake_decode(arg: MichelsonV1Expression): unstake {
  return type0_decode(arg);
}

export async function call_unstake(
  tk: TezosToolkit,
  unstake_kt1: string,
  param: unstake
): Promise<functolib.operation_result> {
  let res = unstake_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, unstake_kt1, "unstake", res);
}

async function deploy_plentyFarmStd_raw(
  tezosKit: TezosToolkit,
  storage: MichelsonV1Expression,
  debug = false
): Promise<string> {
  console.log(
    "[deploy_plenty-farm-std_raw] Deploying new plenty-farm-std smart contract"
  );
  try {
    console.log(`plenty-farm-std initial storage ${JSON.stringify(storage)}`);
    var b = await functolib.client.getBlock();
    let origination_op = await tezosKit.contract.originate({
      code: plentyFarmStd_code,
      init: storage
    });
    console.log(
      `Waiting for confirmation of origination for ${origination_op.contractAddress}...`
    );
    var contract = await origination_op.contract();
    console.log(`Origination completed.`);
    return contract.address;
  } catch (error) {
    console.log(`ERROR in deploy plenty-farm-std: ${JSON.stringify(error)}`);
    throw error;
  }
}

export async function deploy_plentyFarmStd(
  tezosKit: TezosToolkit,
  storage: storage,
  debug = false
): Promise<string> {
  let kt1_address = await deploy_plentyFarmStd_raw(
    tezosKit,
    storage_encode(storage),
    debug
  );
  return kt1_address;
}

export type stake = functolib.nat;
export type initial_stake = functolib.nat;
export function stake_encode(arg: stake): MichelsonV1Expression {
  return functolib.nat_encode(arg);
}
let stake_decode = function (m: MichelsonV1Expression): stake {
  return functolib.nat_decode(m);
};

export async function call_stake(
  tk: TezosToolkit,
  stake_kt1: string,
  param: stake
): Promise<functolib.operation_result> {
  let res = stake_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, stake_kt1, "stake", res);
}

export type type3 = {
  fee: functolib.nat;
  defaultFee: functolib.nat;
  cycles: functolib.nat;
  blocksPerCycle: functolib.nat;
};
export type initial_type3 = {
  fee: functolib.nat;
  defaultFee: functolib.nat;
  cycles: functolib.nat;
  blocksPerCycle: functolib.nat;
};
export function type3_encode(arg: type3): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [
      {
        prim: "Pair",
        args: [
          functolib.nat_encode(arg.blocksPerCycle),
          functolib.nat_encode(arg.cycles)
        ]
      },
      functolib.nat_encode(arg.defaultFee),
      functolib.nat_encode(arg.fee)
    ]
  };
}
export function type3_decode(arg: MichelsonV1Expression): type3 {
  let before_projection = functolib.tuple3_decode(
    functolib.tuple2_decode(functolib.nat_decode, functolib.nat_decode),
    functolib.nat_decode,
    functolib.nat_decode
  )(arg);
  return {
    blocksPerCycle: before_projection[0][0],
    cycles: before_projection[0][1],
    defaultFee: before_projection[1],
    fee: before_projection[2]
  };
}

export type changeUnstakeFee = type3;
export type initial_changeUnstakeFee = type3;

export function changeUnstakeFee_encode(
  arg: changeUnstakeFee
): MichelsonV1Expression {
  return type3_encode(arg);
}

export function changeUnstakeFee_decode(
  arg: MichelsonV1Expression
): changeUnstakeFee {
  return type3_decode(arg);
}

export async function call_changeUnstakeFee(
  tk: TezosToolkit,
  changeUnstakeFee_kt1: string,
  param: changeUnstakeFee
): Promise<functolib.operation_result> {
  let res = changeUnstakeFee_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, changeUnstakeFee_kt1, "changeUnstakeFee", res);
}

export type changeState = functolib.unit;
export type initial_changeState = functolib.unit;
export function changeState_encode(arg: changeState): MichelsonV1Expression {
  return functolib.unit_encode(arg);
}
let changeState_decode = function (m: MichelsonV1Expression): changeState {
  return functolib.unit_decode(m);
};

export async function call_changeState(
  tk: TezosToolkit,
  changeState_kt1: string,
  param: changeState
): Promise<functolib.operation_result> {
  let res = changeState_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, changeState_kt1, "changeState", res);
}

export type changeAdmin = functolib.address;
export type initial_changeAdmin = functolib.address;
export function changeAdmin_encode(arg: changeAdmin): MichelsonV1Expression {
  return functolib.address_encode(arg);
}
let changeAdmin_decode = function (m: MichelsonV1Expression): changeAdmin {
  return functolib.address_decode(m);
};

export async function call_changeAdmin(
  tk: TezosToolkit,
  changeAdmin_kt1: string,
  param: changeAdmin
): Promise<functolib.operation_result> {
  let res = changeAdmin_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, changeAdmin_kt1, "changeAdmin", res);
}

export type WithdrawFee = functolib.unit;
export type initial_WithdrawFee = functolib.unit;
export function WithdrawFee_encode(arg: WithdrawFee): MichelsonV1Expression {
  return functolib.unit_encode(arg);
}
let WithdrawFee_decode = function (m: MichelsonV1Expression): WithdrawFee {
  return functolib.unit_decode(m);
};

export async function call_WithdrawFee(
  tk: TezosToolkit,
  WithdrawFee_kt1: string,
  param: WithdrawFee
): Promise<functolib.operation_result> {
  let res = WithdrawFee_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, WithdrawFee_kt1, "WithdrawFee", res);
}

export type type4 = {
  value: functolib.nat;
  type: functolib.nat;
  token: functolib.address;
  id: functolib.nat;
  address: functolib.address;
};
export type initial_type4 = {
  value: functolib.nat;
  type: functolib.nat;
  token: functolib.address;
  id: functolib.nat;
  address: functolib.address;
};
export function type4_encode(arg: type4): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [
      {
        prim: "Pair",
        args: [
          functolib.address_encode(arg.address),
          functolib.nat_encode(arg.id)
        ]
      },
      functolib.address_encode(arg.token),
      functolib.nat_encode(arg.type),
      functolib.nat_encode(arg.value)
    ]
  };
}
export function type4_decode(arg: MichelsonV1Expression): type4 {
  let before_projection = functolib.tuple4_decode(
    functolib.tuple2_decode(functolib.address_decode, functolib.nat_decode),
    functolib.address_decode,
    functolib.nat_decode,
    functolib.nat_decode
  )(arg);
  return {
    address: before_projection[0][0],
    id: before_projection[0][1],
    token: before_projection[1],
    type: before_projection[2],
    value: before_projection[3]
  };
}

export type RecoverExcessToken = type4;
export type initial_RecoverExcessToken = type4;

export function RecoverExcessToken_encode(
  arg: RecoverExcessToken
): MichelsonV1Expression {
  return type4_encode(arg);
}

export function RecoverExcessToken_decode(
  arg: MichelsonV1Expression
): RecoverExcessToken {
  return type4_decode(arg);
}

export async function call_RecoverExcessToken(
  tk: TezosToolkit,
  RecoverExcessToken_kt1: string,
  param: RecoverExcessToken
): Promise<functolib.operation_result> {
  let res = RecoverExcessToken_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, RecoverExcessToken_kt1, "RecoverExcessToken", res);
}

export type GetReward = functolib.unit;
export type initial_GetReward = functolib.unit;
export function GetReward_encode(arg: GetReward): MichelsonV1Expression {
  return functolib.unit_encode(arg);
}
let GetReward_decode = function (m: MichelsonV1Expression): GetReward {
  return functolib.unit_decode(m);
};

export async function call_GetReward(
  tk: TezosToolkit,
  GetReward_kt1: string,
  param: GetReward
): Promise<functolib.operation_result> {
  let res = GetReward_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, GetReward_kt1, "GetReward", res);
}

export type type5 = { reward: functolib.nat; blocks: functolib.nat };
export type initial_type5 = { reward: functolib.nat; blocks: functolib.nat };
export function type5_encode(arg: type5): MichelsonV1Expression {
  return {
    prim: "Pair",
    args: [functolib.nat_encode(arg.blocks), functolib.nat_encode(arg.reward)]
  };
}
export function type5_decode(arg: MichelsonV1Expression): type5 {
  let before_projection = functolib.tuple2_decode(
    functolib.nat_decode,
    functolib.nat_decode
  )(arg);
  return {
    blocks: before_projection[0],
    reward: before_projection[1]
  };
}

export type AddReward = type5;
export type initial_AddReward = type5;

export function AddReward_encode(arg: AddReward): MichelsonV1Expression {
  return type5_encode(arg);
}

export function AddReward_decode(arg: MichelsonV1Expression): AddReward {
  return type5_decode(arg);
}

export async function call_AddReward(
  tk: TezosToolkit,
  AddReward_kt1: string,
  param: AddReward
): Promise<functolib.operation_result> {
  let res = AddReward_encode(param);
  //console.log(`res: ${JSON.stringify(res,null,2)}`);
  return functolib.send(tk, AddReward_kt1, "AddReward", res);
}

const p = new Parser();
let initial_blockchain_storage: storage = {
  admin: "KT1GpTEq4p2XZ8w9p5xM7Wayyw5VR7tb3UaW",
  balances: { kind: "abstract", value: BigInt("15911") },
  blocksPerCycle: BigInt("8192"),
  defaultUnstakeFee: BigInt("1000000000000000000000000000000000000"),
  faTwoToken: false,
  lastUpdateTime: BigInt("2465821"),
  paused: false,
  periodFinish: BigInt("2482212"),
  rewardPerTokenStored: BigInt("3670259316545783655"),
  rewardRate: BigInt("500000000000000000"),
  rewardToken: "KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b",
  stakeToken: "KT1E8CrG6uznYAG9vZVGtApMJwwTScxPEUKq",
  totalFee: BigInt("242022456169789384"),
  totalSupply: BigInt("662774744495270676080000"),
  unstakeFee: [
    [BigInt("1"), BigInt("25")],
    [BigInt("2"), BigInt("25")],
    [BigInt("3"), BigInt("25")]
  ]
};
/*
 {"prim":"Pair","args":[{"prim":"Pair","args":[{"prim":"Pair","args":[{"string":"KT1GpTEq4p2XZ8w9p5xM7Wayyw5VR7tb3UaW"},{"int":"15911"},{"int":"8192"}]},{"prim":"Pair","args":[{"int":"1000000000000000000000000000000000000"},{"prim":"False"}]},{"int":"2465821"},{"prim":"False"}]},{"prim":"Pair","args":[{"prim":"Pair","args":[{"int":"2482212"},{"int":"3670259316545783655"}]},{"int":"500000000000000000"},{"string":"KT1GRSvLoikDsXujKgZPsGLX8k8VvR2Tq95b"}]},{"prim":"Pair","args":[{"string":"KT1E8CrG6uznYAG9vZVGtApMJwwTScxPEUKq"},{"int":"242022456169789384"}]},{"int":"662774744495270676080000"},[{"prim":"Elt","args":[{"int":"1"},{"int":"25"}]},{"prim":"Elt","args":[{"int":"2"},{"int":"25"}]},{"prim":"Elt","args":[{"int":"3"},{"int":"25"}]}]]}
*/
