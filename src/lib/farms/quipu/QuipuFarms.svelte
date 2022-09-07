<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import type { BigMapAbstraction } from "@taquito/taquito";
  import { bytes2Char } from "@taquito/utils";
  import type BigNumber from "bignumber.js";
  import store from "../../../store";
  import type {
    AvailableInvestment,
    Farm,
    InvestmentData,
    TezosAccountAddress,
    TezosContractAddress,
    IconValue
  } from "../../../types";
  import { AvailableToken } from "../../../types";
  import FarmRow from "../FarmRow.svelte";
  import FarmRowHeader from "../FarmRowHeader.svelte";
  import config from "../../../config";
  import { sortFarmsPerRewards, toNumberOpt } from "../../../utils";

  interface QuipuFarmsStorage {
    storage: {
      farms: BigMapAbstraction;
      users_info: BigMapAbstraction;
      token_metadata: BigMapAbstraction;
      farms_count: BigNumber;
    };
  }
  interface QuipuFarmsData {
    claimed: BigNumber;
    current_delegated: TezosAccountAddress;
    end_time: string;
    fees: { harvest_fee: BigNumber; withdrawal_fee: BigNumber };
    fid: BigNumber;
    next_candidate: TezosAccountAddress;
    paused: boolean;
    reward_per_second: BigNumber;
    reward_per_share: BigNumber;
    reward_token: { fA2: { id: BigNumber; token: TezosContractAddress } };
    stake_params: {
      staked_token: { fA2: { id: BigNumber; token: TezosContractAddress } };
      is_v1_lp: boolean;
    };
    staked: BigNumber;
    start_time: string;
    timelock: BigNumber;
    upd: string;
  }

  let farms: Array<Farm> = [];
  const dispatch = createEventDispatcher();
  let totalRewards: Array<{ id: AvailableInvestment; rewards: number }> = [];
  let harvestingAll = false;
  let quipuReady = false;

  const harvestAll = async () => {
    console.log("harvest all quipu");
  };

  onMount(async () => {
    if ($store.userAddress) {
      const farmsContract = await $store.Tezos.wallet.at(
        config.quipuFarmsContract
      );
      const farmsStorage: QuipuFarmsStorage = await farmsContract.storage();
      // gets user's farms
      const farmsUrls = [
        ...Array(farmsStorage.storage.farms_count.toNumber()).keys()
      ].map(
        index =>
          `https://api.tzkt.io/v1/contracts/${config.quipuFarmsContract}/bigmaps/users_info/keys/{"nat":"${index}","address":"${$store.userAddress}"}`
      );
      const farmsData = await Promise.all(
        farmsUrls.map((url, index) =>
          fetch(url)
            .then(res => res.json())
            .then(res => ({
              index,
              address: config.quipuFarmsContract,
              ...res
            }))
            .catch(err => JSON.stringify(err))
        )
      );
      if (farmsData) {
        farms = farmsData
          .filter(data => typeof data !== "string")
          .filter(data => data.active && +data.value.staked > 0)
          .map(data => ({
            //HACK: maybe find a more elegant way for the id
            id: `QUIPU-FARM-${data.index}` as AvailableInvestment,
            address: data.address,
            balance: +data.value.staked
          }));
        if (farms.length > 0) {
          // populates investment data
          let quipuFarmsData: Array<InvestmentData> = []; // for farm data
          const farmsInvestmentData =
            await farmsStorage.storage.farms.getMultipleValues([
              ...farms.map(farm => +farm.id.replace("QUIPU-FARM-", ""))
            ]);
          farmsInvestmentData.forEach((val: QuipuFarmsData, key: number) => {
            if (val) {
              const thisFarm = farms.find(
                farm => farm.id === `QUIPU-FARM-${key}`
              );
              const rewardToken = Object.entries($store.tokens).find(
                ([_, tokenData]) =>
                  tokenData.address === val.reward_token.fA2.token
              );
              quipuFarmsData.push({
                id: `QUIPU-FARM-${key}` as AvailableInvestment,
                platform: "quipuswap",
                address: config.quipuFarmsContract as TezosContractAddress,
                decimals: 6,
                info: [
                  val.timelock.isEqualTo(0)
                    ? "no-lock"
                    : val.timelock.dividedBy(86400).toNumber() + "-day-lock"
                ],
                rewardToken: rewardToken
                  ? (rewardToken[0] as AvailableToken)
                  : undefined,
                liquidityToken: true,
                type: "",
                open: new Date(val.end_time).getTime() > Date.now(),
                // to be updated later
                alias: "",
                icons: [],
                balance: thisFarm.balance,
                favorite: false
              });
            }
          });
          // gets the token pair from the staked token
          const tokensMetadata =
            await farmsStorage.storage.token_metadata.getMultipleValues([
              ...farms.map(farm => +farm.id.replace("QUIPU-FARM-", ""))
            ]);
          quipuFarmsData = quipuFarmsData.map(farmData => {
            const id = +farmData.id.replace("QUIPU-FARM-", "");
            const mtdt: any = tokensMetadata.get(id);
            if (mtdt) {
              const decimals: string = bytes2Char(
                mtdt.token_info.get("decimals")
              );
              const description: string = bytes2Char(
                mtdt.token_info.get("name")
              );
              farmData.alias = description;
              // figures out the token pair
              const tokens = description.split(" ")[0].split("/");
              if (tokens.length > 1) {
                farmData.icons = tokens.map(tk => {
                  if (tk === "XTZ" || tk === "TEZ") {
                    return "XTZ" as IconValue;
                  } else if (
                    Object.values(AvailableToken).includes(tk as AvailableToken)
                  ) {
                    return tk as IconValue;
                  } else {
                    return "unknown_token" as IconValue;
                  }
                });
                farmData.alias = `${tokens.join("-")} farm ${farmData.info[0]}`;
              }

              farmData.decimals = toNumberOpt(decimals).match({
                None: () => 0,
                Some: val => val
              });
            }

            return farmData;
          });
          // updates investment balance
          store.updateInvestments(
            farms.map(farm => [
              farm.id,
              quipuFarmsData.find(quipuFarm => quipuFarm.id === farm.id)
            ])
          );
          // updates local storage
          $store.localStorage.addFarms(farms.map(farm => farm.id));
        }
        quipuReady = true;
      } else {
        // TODO: display a toast with the error
        console.error("Error while fetching Plenty farms");
      }
    }
  });
</script>

{#if $store.userAddress && farms.length > 0 && quipuReady}
  <FarmRowHeader
    totalRewards={totalRewards.map(farm => farm.rewards)}
    name="QuipuSwap"
    {harvestingAll}
    on:harvest-all={harvestAll}
  />
  {#each farms.sort( (a, b) => sortFarmsPerRewards(a, b, totalRewards) ) as farm, index (farm.id)}
    <FarmRow
      invName={farm.id}
      pos={index}
      on:farm-update={event => {
        const val = event.detail;
        const farms = totalRewards.filter(farm => farm.id !== val.id);
        totalRewards = [...farms, val];
        dispatch("farm-update", val);
      }}
      on:roi-per-week={event => dispatch("roi-per-week", event.detail)}
    />
  {/each}
{/if}
