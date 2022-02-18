<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { push } from "svelte-spa-router";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import {
    loadInvestment,
    getPaulReward,
    getKdaoReward,
    prepareOperation,
    formatTokenAmount
  } from "../../utils";
  import {
    getPlentyReward,
    formatPlentyLpAmount
  } from "../../tokenUtils/plentyUtils";
  import { getWrapReward } from "../../tokenUtils/wrapUtils";
  import {
    AvailableToken,
    AvailableInvestments,
    InvestmentPlatform,
    InvestmentData
  } from "../../types";
  import PlentyRow from "./Row/PlentyRow.svelte";
  import WrapRow from "./Row/WrapRow.svelte";
  import PaulRow from "./Row/PaulRow.svelte";
  import KdaoRow from "./Row/KdaoRow.svelte";
  import XPlentyRow from "./Row/XPlentyRow.svelte";
  import SmakRow from "./Row/SmakRow.svelte";
  import YouvesRow from "./Row/YouvesRow.svelte";
  import InvestmentSpread from "./InvestmentSpread.svelte";
  import PlentyTotalRewards from "./PlentyTotalRewards.svelte";
  import Modal from "../Modal/Modal.svelte";
  import config from "../../config";
  import toastStore from "../Toast/toastStore";

  let readyToHarvest = 0;
  let availableRewards: {
    id: AvailableInvestments;
    platform: string;
    amount: number;
  }[] = [];
  let lastRewardsCheck = 0;
  let totalValueInFarms: [AvailableInvestments, number][] = [];
  let harvestingAllPlenty = false;
  let harvestingAllPlentySuccess = undefined;
  let harvestingAllPaul = false;
  let harvestingAllPaulSuccess = undefined;
  let harvestingAllWrap = false;
  let harvestingAllWrapSuccess = undefined;
  let unstakedLpTokens: [AvailableInvestments, string, number][] = [];
  let selectFarmModal: null | InvestmentPlatform = null;
  let searchingForStakes = false;
  let searchingForStakesPlatform: InvestmentPlatform | null = null;
  let loadingSearchingForStakes = false;
  let foundStakes: {
    platform: InvestmentPlatform;
    id: AvailableInvestments;
    name: string;
    balance: number;
  }[] = [];
  let farmAprs: { id: AvailableInvestments; apr: number }[] = [];
  let totalPaulRewards: number | null = null;
  let totalPlentyRewards: number | null = null;
  let totalWrapRewards: number | null = null;
  let totalRoiPerWeek: { [p in AvailableInvestments]: number } | {} = {};
  let selectedEstimatedRoi: "day" | "week" | "month" | "year" = "week";

  const addFavoriteInvestment = async investment => {
    // fetches balance for investment
    const savedInv = await loadInvestment(investment, $store.userAddress);
    if (savedInv) {
      store.updateInvestments({
        ...$store.investments,
        [savedInv.id]: {
          ...$store.investments[savedInv.id],
          balance: savedInv.balance,
          info: savedInv.info,
          favorite: true
        }
      });
      // saves investment into the local storage
      localStorageStore.addFavoriteInvestment(investment);
    }
  };

  const removeFavoriteInvestment = async investment => {
    // removes investment from local storage
    localStorageStore.removeFavoriteInvestment(investment);
    // resets balance to zero in store
    store.updateInvestments({
      ...$store.investments,
      [investment]: {
        ...$store.investments[investment],
        balance: 0,
        favorite: false
      }
    });
  };

  const harvestAllPlenty = async () => {
    harvestingAllPlenty = true;
    // gets the addresses of pools with rewards to harvest
    let allRewards = (
      await Promise.all(
        Object.values($store.investments)
          .filter(inv => inv.platform === "plenty")
          .filter(inv =>
            $localStorageStore.favoriteInvestments.includes(inv.id)
          )
          .map(inv =>
            (async () => ({
              address: inv.address,
              rewards: await getPlentyReward(
                $store.userAddress,
                inv.address,
                $store.lastOperations[0].level,
                inv.decimals
              )
            }))()
          )
      )
    ).filter(res => res.rewards.status && res.rewards.totalRewards > 0);
    const contractCalls = await Promise.all(
      allRewards.map(async res => {
        const contract = await $store.Tezos.wallet.at(res.address);
        return contract.methods.GetReward([["unit"]]);
      })
    );
    const fee = [
      0,
      0,
      ...allRewards.map(res => res.rewards.totalRewards)
    ].reduce((a, b) => +a + +b);
    console.log(contractCalls, fee);
    // batches transactions
    try {
      const batch = prepareOperation({
        contractCalls: contractCalls,
        amount: +fee,
        tokenSymbol: AvailableToken.PLENTY
      });
      const op = await batch.send();
      await op.confirmation();
      const receipt = await op.receipt();
      harvestingAllPlenty = false;
      if (!receipt) {
        harvestingAllPlentySuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingAllPlentySuccess = true;
        setTimeout(() => {
          harvestingAllPlentySuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
    } finally {
      harvestingAllPlenty = false;
    }
  };

  const harvestAllPaul = async () => {
    harvestingAllPaul = true;
    // gets the addresses of pools with rewards to harvest
    let allRewards = (
      await Promise.all(
        Object.values($store.investments)
          .filter(inv => inv.platform === "paul")
          .filter(inv =>
            $localStorageStore.favoriteInvestments.includes(inv.id)
          )
          .map(inv =>
            (async () => ({
              address: inv.address,
              rewards: await getPaulReward(inv.address)
            }))()
          )
      )
    ).filter(res => res.rewards && res.rewards.toNumber() > 0);
    const contractCalls = await Promise.all(
      allRewards.map(async res => {
        const contract = await $store.Tezos.wallet.at(res.address);
        return contract.methods.earn($store.userAddress);
      })
    );
    const fee = [0, 0, ...allRewards.map(res => res.rewards.toNumber())].reduce(
      (a, b) => +a + +b
    );
    console.log(contractCalls, fee);
    // batches transactions
    try {
      const batch = prepareOperation({
        contractCalls: contractCalls,
        amount: +fee,
        tokenSymbol: AvailableToken.PAUL
      });
      const op = await batch.send();
      await op.confirmation();
      const receipt = await op.receipt();
      harvestingAllPaul = false;
      if (!receipt) {
        harvestingAllPaulSuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingAllPaulSuccess = true;
        setTimeout(() => {
          harvestingAllPaulSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        title: "Harvest error",
        text: error.message ? error.message : `Unable to harvest Alien's farms`,
        dismissable: true,
        icon: "agriculture"
      });
    } finally {
      harvestingAllPaul = false;
    }
  };

  const harvestAllWrap = async () => {
    harvestingAllWrap = true;
    // gets the addresses of pools with rewards to harvest
    let allRewards = (
      await Promise.all(
        Object.values($store.investments)
          .filter(inv => inv.platform === "wrap")
          .filter(inv =>
            $localStorageStore.favoriteInvestments.includes(inv.id)
          )
          .map(inv =>
            (async () => ({
              address: inv.address,
              rewards: await getWrapReward(
                inv.id,
                inv.address,
                $store.userAddress,
                inv.balance
              )
            }))()
          )
      )
    ).filter(res => res.rewards && res.rewards.toNumber() > 0);

    const contractCalls = await Promise.all(
      allRewards.map(async res => {
        const contract = await $store.Tezos.wallet.at(res.address);
        return contract.methods.claim([["unit"]]);
      })
    );
    const fee = [0, 0, ...allRewards.map(res => res.rewards.toNumber())].reduce(
      (a, b) => +a + +b
    );
    console.log("Fee:", fee);
    // batches transactions
    try {
      const batch = prepareOperation({
        contractCalls: contractCalls,
        amount: 0, //+fee,
        tokenSymbol: AvailableToken.WRAP
      });
      const op = await batch.send();
      await op.confirmation();
      const receipt = await op.receipt();
      harvestingAllWrap = false;
      if (!receipt) {
        harvestingAllWrapSuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingAllWrapSuccess = true;
        setTimeout(() => {
          harvestingAllWrapSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
      toastStore.addToast({
        type: "error",
        title: "Harvest error",
        text: error.message ? error.message : `Unable to harvest Wrap farms`,
        dismissable: true,
        icon: "agriculture"
      });
    } finally {
      harvestingAllWrap = false;
    }
  };

  const resetRewards = (id: AvailableInvestments) => {
    availableRewards = [
      ...availableRewards.map(rw => {
        if (rw.id === id) {
          return { ...rw, amount: 0 };
        } else {
          return rw;
        }
      })
    ];
  };

  const createTooltipContent = (
    token1: AvailableToken | "XTZ",
    token2: AvailableToken | "XTZ"
  ): string => {
    const exchangeRate1 = $store.tokens[token1]
      ? formatTokenAmount($store.tokens[token1].exchangeRate)
      : "0";

    if (token2 && token2 !== "XTZ") {
      const exchangeRate2 = $store.tokens[token2]
        ? formatTokenAmount($store.tokens[token2].exchangeRate)
        : "0";

      return `<div>${token1}: ${exchangeRate1} ꜩ<br />${token2}: ${exchangeRate2} ꜩ</div>`;
    } else {
      if (token2) {
        return `<div>${token1}: ${exchangeRate1} ꜩ<br />${token2}: ${formatTokenAmount(
          $store.xtzData.exchangeRate
        )} ${$localStorageStore.preferredFiat}</div>`;
      } else {
        return `<div>${token1}: ${exchangeRate1} ꜩ</div>`;
      }
    }
  };

  const sortFarmsPerRewards = (
    token1Data: InvestmentData,
    token2Data: InvestmentData
  ): number => {
    if (
      availableRewards.length > 0 &&
      availableRewards.find(rw => rw.id === token1Data.id) &&
      availableRewards.find(rw => rw.id === token2Data.id)
    ) {
      //console.log(availableRewards.find(rw => rw.id === a[1].id).amount, availableRewards.find(rw => rw.id === b[1].id).amount);
      const token1Amount = availableRewards.find(
        rw => rw.id === token1Data.id
      ).amount;
      const token2Amount = availableRewards.find(
        rw => rw.id === token2Data.id
      ).amount;
      if (token1Amount === undefined || token2Amount === undefined) {
        return 0;
      } else if (token1Amount > token2Amount) {
        return -1;
      } else if (token1Amount < token2Amount) {
        return 1;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  };

  const sortFarmSelectModal = (
    favoriteInvestments: AvailableInvestments[],
    favorite: boolean,
    platform: InvestmentPlatform,
    type?: string
  ): [string, InvestmentData][] => {
    if (!favoriteInvestments)
      return Object.entries($store.investments).filter(
        inv => inv[1].platform === platform
      );

    return Object.entries($store.investments)
      .filter(inv => inv[1].platform === platform)
      .filter(inv => {
        if (platform === "plenty") {
          return !inv[0].includes("Ctez");
        } else {
          return true;
        }
      })
      .filter(inv =>
        favorite
          ? favoriteInvestments.includes(inv[1].id)
          : !favoriteInvestments.includes(inv[1].id)
      )
      .filter(inv => (type ? inv[1].type === type : true))
      .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
  };

  const findStakes = async (platform: InvestmentPlatform) => {
    if (platform) {
      foundStakes = [];
      searchingForStakes = true;
      loadingSearchingForStakes = true;
      searchingForStakesPlatform = platform;
      if (platform === "plenty") {
        const plentyFarms = Object.values($store.investments).filter(
          inv => inv.platform === "plenty"
        );
        try {
          const plentyFarmBalancesRes = await Promise.allSettled(
            plentyFarms.map(async farm => ({
              balance: await fetch(
                `https://api.tzkt.io/v1/contracts/${farm.address}/bigmaps/balances/keys/${$store.userAddress}`
              )
                .then(res => res.json())
                .catch(err => undefined),
              alias: farm.alias,
              id: farm.id
            }))
          );
          const plentyFarmBalances = plentyFarmBalancesRes.filter(
            res =>
              res.status === "fulfilled" &&
              res.value.balance &&
              res.value.balance.active &&
              +res.value.balance.value.balance > 0
          );
          if (plentyFarmBalances.length > 0) {
            foundStakes = plentyFarmBalances.map((farm: any) => ({
              platform: "plenty",
              id: farm.value.id,
              name: farm.value.alias,
              balance: formatTokenAmount(
                +farm.value.balance.value.balance / 10 ** 18
              )
            }));
          }
        } catch (error) {
          console.error(error);
          toastStore.addToast({
            type: "error",
            title: "Balance error",
            text: `Unable to fetch balances for ${platform.toUpperCase()}`,
            dismissable: true
          });
        } finally {
          loadingSearchingForStakes = false;
        }
      } else if (platform === "wrap") {
        const wrapFarms = Object.values($store.investments).filter(
          inv => inv.platform === "wrap"
        );
        try {
          const wrapFarmBalancesRes = await Promise.allSettled(
            wrapFarms.map(async farm => ({
              balance: await fetch(
                `https://api.tzkt.io/v1/contracts/${farm.address}/bigmaps/${
                  farm.id.slice(-3) === "-FM" ? "balances" : "delegators"
                }/keys/${$store.userAddress}`
              )
                .then(res => res.json())
                .catch(err => undefined),
              alias: farm.alias,
              id: farm.id
            }))
          );
          const wrapFarmBalances = wrapFarmBalancesRes.filter(
            res =>
              res.status === "fulfilled" &&
              res.value.balance &&
              res.value.balance.active
          );
          if (wrapFarmBalances.length > 0) {
            foundStakes = wrapFarmBalances.map((farm: any) => {
              if (farm.value.id === "WRAP-STACKING") {
                return {
                  platform: "wrap",
                  id: farm.value.id,
                  name: farm.value.alias,
                  balance: formatTokenAmount(
                    farm.value.id.slice(-3) === "-FM"
                      ? +farm.value.balance.value.balance / 10 ** 8
                      : +farm.value.balance.value.balance / 10 ** 6
                  )
                };
              } else if (farm.value.id.slice(-3) === "-LM") {
                return {
                  platform: "wrap",
                  id: farm.value.id,
                  name: farm.value.alias,
                  balance: formatTokenAmount(
                    farm.value.id.slice(-3) === "-FM"
                      ? +farm.value.balance.value.lpTokenBalance / 10 ** 8
                      : +farm.value.balance.value.lpTokenBalance / 10 ** 6
                  )
                };
              } else if (farm.value.id.slice(-3) === "-FM") {
                return {
                  platform: "wrap",
                  id: farm.value.id,
                  name: farm.value.alias,
                  balance: formatTokenAmount(
                    farm.value.id.slice(-3) === "-FM"
                      ? +farm.value.balance.value / 10 ** 8
                      : +farm.value.balance.value / 10 ** 6
                  )
                };
              }
            });
          }
        } catch (error) {
          console.error(error);
          toastStore.addToast({
            type: "error",
            title: "Balance error",
            text: `Unable to fetch balances for ${platform.toUpperCase()}`,
            dismissable: true
          });
        } finally {
          loadingSearchingForStakes = false;
        }
      } else if (platform === "paul") {
        const paulFarms = Object.values($store.investments).filter(
          inv => inv.platform === "paul"
        );
        try {
          const paulFarmBalancesRes = await Promise.allSettled(
            paulFarms.map(async farm => ({
              balance: await fetch(
                `https://api.tzkt.io/v1/contracts/${farm.address}/bigmaps/account_info/keys/${$store.userAddress}`
              )
                .then(res => res.json())
                .catch(err => undefined),
              alias: farm.alias,
              id: farm.id
            }))
          );
          const paulFarmBalances = paulFarmBalancesRes.filter(
            res =>
              res.status === "fulfilled" &&
              res.value.balance &&
              res.value.balance.active
          );
          if (paulFarmBalances.length > 0) {
            foundStakes = paulFarmBalances.map((farm: any) => {
              return {
                platform: "paul",
                id: farm.value.id,
                name: farm.value.alias,
                balance: formatTokenAmount(
                  +farm.value.balance.value.amount / 10 ** 6
                )
              };
            });
          }
        } catch (error) {
          console.error(error);
          toastStore.addToast({
            type: "error",
            title: "Balance error",
            text: `Unable to fetch balances for ${platform.toUpperCase()}`,
            dismissable: true
          });
        } finally {
          loadingSearchingForStakes = false;
        }
      } else {
        console.log(platform);
      }
      loadingSearchingForStakes = false;
    } else {
      toastStore.addToast({
        type: "error",
        title: "Error",
        text: `No platform name`,
        dismissable: true
      });
    }
  };

  const sortFarmsByApr = (farm: { id: AvailableInvestments; apr: number }) => {
    if (!farmAprs.find(f => f.id == farm.id)) {
      const newFarmsList = [...farmAprs, farm].sort((a, b) => b.apr - a.apr);
      farmAprs = [...newFarmsList];
    }
  };

  onMount(async () => {
    if (!$store.userAddress) push("/");

    // looks for unstaked LP tokens
    if (
      $store.Tezos &&
      $store.userAddress &&
      $localStorageStore &&
      $localStorageStore.favoriteInvestments
    ) {
      // PLENTY
      const plentyLptAddresses = $localStorageStore.favoriteInvestments
        .map(inv => config.plentyLptAddresses[inv.replace("-LP", "") + "-LP"])
        .filter(el => el);
      const accountPromises = await Promise.all(
        plentyLptAddresses.map(async addr => {
          const contract = await $store.Tezos.wallet.at(addr);
          const storage: any = await contract.storage();
          return await storage.balances.get($store.userAddress);
        })
      );
      if (accountPromises && accountPromises.length > 0) {
        const lptAddresses = Object.entries(config.plentyLptAddresses);
        unstakedLpTokens = accountPromises
          .map((acc: any) => acc.balance.toNumber())
          .map((balance, i) => [
            ...lptAddresses.find(val => val[1] === plentyLptAddresses[i]),
            balance
          ])
          .filter(item => +item[2] > 0)
          .map(item => [
            item[0],
            item[1],
            formatPlentyLpAmount(item[2], item[0])
          ]);
      }
      // checks if user has stake in Youves uUSD-uBTC long-term farm
      const youvesUusdUbtcFarm = await loadInvestment(
        AvailableInvestments["YOUVES-UUSD-UBTC"],
        $store.userAddress
      );
      if (youvesUusdUbtcFarm) {
        store.updateInvestments({
          ...$store.investments,
          [AvailableInvestments["YOUVES-UUSD-UBTC"]]: {
            ...$store.investments[AvailableInvestments["YOUVES-UUSD-UBTC"]],
            balance: youvesUusdUbtcFarm.balance,
            info: youvesUusdUbtcFarm.info
          }
        });
      }
    }
  });

  afterUpdate(async () => {
    // calculates available rewards
    if (
      $localStorageStore &&
      $localStorageStore.favoriteInvestments &&
      $store.investments &&
      $store.lastOperations.length > 0 &&
      lastRewardsCheck + 10_000 < Date.now()
    ) {
      lastRewardsCheck = Date.now();

      const investmentData: InvestmentData[] =
        $localStorageStore.favoriteInvestments
          .map(inv => $store.investments[inv])
          .filter(
            inv =>
              inv.platform === "plenty" ||
              inv.platform === "paul" ||
              inv.platform === "kdao" ||
              inv.platform === "wrap"
          )
          .filter(inv => inv.id !== AvailableInvestments["xPLENTY-Staking"]);
      const rewards: any = await Promise.all(
        investmentData.map(async inv => {
          let rewards;
          if (inv.platform === "plenty") {
            rewards = await getPlentyReward(
              $store.userAddress,
              inv.address,
              $store.lastOperations[0].level,
              inv.rewardToken === AvailableToken.YOU
                ? $store.investments[inv.id].decimals
                : 18
            );
          } else if (inv.platform === "paul") {
            rewards = await getPaulReward(inv.address);
          } else if (inv.platform === "kdao") {
            rewards = await getKdaoReward(
              inv.address,
              $store.userAddress,
              $store.lastOperations[0].level
            );
          } else if (inv.platform === "wrap") {
            rewards = await getWrapReward(
              inv.id,
              inv.address,
              $store.userAddress,
              inv.balance
            );
            //console.log(inv.id, rewards.toNumber());
          }

          return {
            platform: inv.platform,
            id: inv.id,
            amount: rewards
          };
        })
      );
      readyToHarvest = 0;
      rewards.forEach(rw => {
        let tempRw = { ...rw };
        if (rw.platform === "plenty") {
          tempRw.amount = tempRw.amount.totalRewards;
          readyToHarvest += tempRw.amount * $store.tokens.PLENTY.exchangeRate;
        } else if (rw.platform === "paul") {
          tempRw.amount =
            tempRw.amount.toNumber() / 10 ** $store.tokens.PAUL.decimals;
          readyToHarvest += tempRw.amount * $store.tokens.PAUL.exchangeRate;
        } else if (rw.platform === "kdao") {
          tempRw.amount =
            tempRw.amount.toNumber() / 10 ** $store.tokens.kDAO.decimals;
          readyToHarvest += tempRw.amount * $store.tokens.kDAO.exchangeRate;
        } else if (rw.platform === "wrap") {
          if (rw.id === AvailableInvestments["WRAP-STACKING"]) {
            tempRw.amount =
              tempRw.amount.toNumber() / 10 ** $store.tokens.WRAP.decimals;
          } else {
            tempRw.amount = tempRw.amount.toNumber();
          }
          readyToHarvest += tempRw.amount * $store.tokens.WRAP.exchangeRate;
        }

        availableRewards = [
          ...availableRewards.filter(arw => arw.id !== rw.id),
          tempRw
        ];
      });

      totalPlentyRewards = [
        0,
        0,
        ...availableRewards
          .filter(
            rw =>
              rw.platform === "plenty" &&
              $store.investments[rw.id].rewardToken === AvailableToken.PLENTY
          )
          .map(rw => +rw.amount)
      ].reduce((a, b) => a + b);

      totalPaulRewards = [
        0,
        0,
        ...availableRewards
          .filter(rw => rw.platform === "paul")
          .map(rw => +rw.amount)
      ].reduce((a, b) => a + b);

      totalWrapRewards = [
        0,
        0,
        ...availableRewards
          .filter(
            rw =>
              rw.platform === "wrap" &&
              $store.investments[rw.id].rewardToken === AvailableToken.WRAP
          )
          .map(rw => +rw.amount)
      ].reduce((a, b) => a + b);
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  section {
    padding: 20px 10px;
    height: 80vh;
    overflow: auto;

    .user-tokens-stats {
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 1.4rem;
      padding: 10px;
      text-align: center;
    }

    .farm-selection {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around;
      align-items: center;
    }

    .row-header,
    .row-footer {
      display: grid;
      grid-template-columns: 10% 25% 16% 17% 14% 18%;
      align-items: center;
      padding: 10px;
    }
    .row-header {
      background-color: darken($container-bg-color, 3);
      color: white;
      padding: 5px 10px;
    }
    .row-footer {
      color: $container-bg-color;
      background-color: lighten($container-bg-color, 65);
      padding: 15px 10px;
      margin-bottom: 10px;
      border-radius: 10px;

      .total-rewards {
        text-align: center;
        grid-column: 3 / span 3;
      }
    }

    .unstaked-token,
    .best-farm-apr {
      display: grid;
      grid-template-columns: 10% 25% 65%;
      padding: 10px;
      align-items: center;
      transition: 0.3s;

      &:hover {
        background-color: lighten($container-bg-color, 65);
      }

      a {
        color: inherit;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      .icon {
        img {
          width: 25px;
          height: 25px;
        }
      }
    }

    .farm-title {
      font-size: 0.8rem;
      padding: 5px 0px 0px 30px;
    }
  }

  .farm-selection-modal {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-around;
    align-items: center;
    height: 100%;

    .farm-to-select {
      padding: 5px;
      margin: 5px;
      font-size: 0.9rem;
      transition: 0.3s;
      border: solid 2px transparent;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;

      &:hover {
        border-color: lighten($container-bg-color, 60);
      }

      &.favorite {
        border-color: lighten($container-bg-color, 60);
        background-color: lighten($container-bg-color, 60);
      }
    }
  }
</style>

<section>
  <div class="user-tokens-stats">
    <div class="total-value">
      <div>Total value in farms</div>
      <div>
        {totalValueInFarms.length > 0
          ? (
              +[0, ...totalValueInFarms.map(val => val[1])]
                .reduce((a, b) => a + b)
                .toFixed(3) / 1
            ).toLocaleString("en-US")
          : 0} ꜩ
      </div>
      <div>
        {(totalValueInFarms.length > 0
          ? +(
              [0, ...totalValueInFarms.map(val => val[1])].reduce(
                (a, b) => a + b
              ) * $store.xtzData.exchangeRate
            ).toFixed(2) / 1
          : 0
        ).toLocaleString("en-US")}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
    <div class="ready-to-harvest">
      <div>Ready to harvest</div>
      <div>
        {readyToHarvest
          ? (+readyToHarvest.toFixed(3) / 1).toLocaleString("en-US")
          : 0} ꜩ
      </div>
      <div>
        {(readyToHarvest
          ? +(readyToHarvest * $store.xtzData.exchangeRate).toFixed(2) / 1
          : 0
        ).toLocaleString("en-US")}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
    {#if Object.values(totalRoiPerWeek).length > 0}
      <div class="total-roi-per-week">
        <div>
          Estimated ROI/<select
            style="font-size:inherit;color:inherit;background-color:transparent"
            bind:value={selectedEstimatedRoi}
            on:change={ev => (selectedEstimatedRoi = ev.target.value)}
          >
            <option value="day" selected={selectedEstimatedRoi === "day"}>
              day
            </option>
            <option value="week" selected={selectedEstimatedRoi === "week"}>
              week
            </option>
            <option value="month" selected={selectedEstimatedRoi === "month"}>
              month
            </option>
            <option value="year" selected={selectedEstimatedRoi === "year"}>
              year
            </option>
          </select>
        </div>
        <div>
          {#if selectedEstimatedRoi === "day"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) / 7
            )}
          {:else if selectedEstimatedRoi === "week"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce((a, b) => a + b)
            )}
          {:else if selectedEstimatedRoi === "month"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) * 4
            )}
          {:else if selectedEstimatedRoi === "year"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) * 52
            )}
          {/if}
          ꜩ
        </div>
        <div>
          {#if selectedEstimatedRoi === "day"}
            {formatTokenAmount(
              ([0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) /
                7) *
                $store.xtzData.exchangeRate,
              2
            ).toLocaleString("en-US")}
          {:else if selectedEstimatedRoi === "week"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) * $store.xtzData.exchangeRate,
              2
            ).toLocaleString("en-US")}
          {:else if selectedEstimatedRoi === "month"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) *
                4 *
                $store.xtzData.exchangeRate,
              2
            ).toLocaleString("en-US")}
          {:else if selectedEstimatedRoi === "year"}
            {formatTokenAmount(
              [0, 0, ...Object.values(totalRoiPerWeek)].reduce(
                (a, b) => a + b
              ) *
                52 *
                $store.xtzData.exchangeRate,
              2
            ).toLocaleString("en-US")}
          {/if}
          {$localStorageStore.preferredFiat}
        </div>
      </div>
    {/if}
  </div>
  <br />
  <div class="farm-selection">
    <div id="plenty-farms">
      <button
        class="primary"
        on:click={() => {
          selectFarmModal = "plenty";
        }}
      >
        <img src="images/PLENTY.png" alt="Plenty" />
        &nbsp; Plenty
        <span class="material-icons"> arrow_drop_down </span>
      </button>
    </div>
    <div id="wrap-farms">
      <button
        class="primary"
        on:click={() => {
          selectFarmModal = "wrap";
        }}
      >
        <img src="images/WRAP.png" alt="WRAP" />
        &nbsp; WRAP
        <span class="material-icons"> arrow_drop_down </span>
      </button>
    </div>
    <div id="paul-farms">
      <button
        class="primary"
        on:click={() => {
          selectFarmModal = "paul";
        }}
      >
        <img src="images/PAUL.png" alt="Paul" />
        &nbsp; Paul
        <span class="material-icons"> arrow_drop_down </span>
      </button>
    </div>
    <div id="kdao-farms">
      <button
        class="primary"
        on:click={() => {
          selectFarmModal = "kdao";
        }}
      >
        <img src="images/kDAO.png" alt="kDAO" />
        &nbsp; kDAO
        <span class="material-icons"> arrow_drop_down </span>
      </button>
    </div>
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <div id="smak-farms">
        <button
          class="primary"
          on:click={() => {
            selectFarmModal = "smak";
          }}
        >
          <img src="images/SMAK.png" alt="SMAK" />
          &nbsp; SMAK
          <span class="material-icons"> arrow_drop_down </span>
        </button>
      </div>
    {/if}
  </div>
  <br />
  {#if $localStorageStore.favoriteInvestments}
    <div class="favorite-investments">
      <!-- PLENTY FARMS -->
      {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty").length > 0}
        <div class="row-header">
          <div style="grid-column: 1 / span 2">Plenty Farms</div>
        </div>
      {/if}
      <!-- PLENTY FARMS WITH STABLECOINS -->
      {#if Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty")
        .filter(inv => config.stablecoins.includes(inv[1].icons[1])).length > 0}
        <div class="farm-title">Stablecoins</div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty")
        .filter(inv => config.stablecoins.includes(inv[1].icons[1]))
        .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
        <PlentyRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
      <!-- PLENTY FARMS WITH STABLECOINS -->
      {#if Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty")
        .filter(inv => !config.stablecoins.includes(inv[1].icons[1])).length > 0}
        <div class="farm-title">Other tokens</div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty")
        .filter(inv => !config.stablecoins.includes(inv[1].icons[1]))
        .filter(inv => inv[0] !== AvailableInvestments["xPLENTY-Staking"])
        .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
        <PlentyRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
      {#if $localStorageStore.favoriteInvestments.includes("xPLENTY-Staking")}
        <div class="farm-title">xPLENTY Staking</div>
        <XPlentyRow />
      {/if}
      {#if $localStorageStore.favoriteInvestments && $localStorageStore.favoriteInvestments.length > 0 && $localStorageStore.favoriteInvestments.filter( inv => inv.includes("PLENTY") ).length > 0}
        <div class="row-footer">
          <div style="grid-column: 1 / span 2">
            <button
              class="primary"
              on:click={async () => await findStakes("plenty")}
            >
              <span class="material-icons"> search </span>
              Find my stakes
            </button>
          </div>
          {#if availableRewards.filter(rw => rw.platform === "plenty").length > 0}
            <div class="total-rewards" id="total-plenty-rewards">
              Total rewards: {formatTokenAmount(totalPlentyRewards)} PLENTY
              <br />
              <span style="font-size:0.7rem">
                ({+(
                  totalPlentyRewards * $store.tokens.PLENTY.exchangeRate
                ).toFixed(5) / 1} ꜩ / {+(
                  totalPlentyRewards *
                  $store.tokens.PLENTY.exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2) / 1}
                {$localStorageStore.preferredFiat || "USD"})
              </span>
            </div>
            <div style="display:flex;justify-content:center">
              {#if harvestingAllPlenty}
                <button class="primary loading">
                  <span class="material-icons"> sync </span>
                  Harvesting
                </button>
              {:else}
                <!-- Harvest button states -->
                {#if harvestingAllPlentySuccess === true}
                  <button class="primary success"> Harvested! </button>
                {:else if harvestingAllPlentySuccess === false}
                  <button class="primary error" on:click={harvestAllPlenty}>
                    Retry
                  </button>
                {:else}
                  <button class="primary" on:click={harvestAllPlenty}>
                    <span class="material-icons"> agriculture </span>&nbsp;
                    Harvest all
                  </button>
                {/if}
              {/if}
            </div>
          {:else}
            <div />
          {/if}
        </div>
      {/if}
      <!-- WRAP FARMS -->
      {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap").length > 0}
        <div class="row-header">
          <div style="grid-column: 1 / span 2">Wrap Farms</div>
        </div>
      {/if}
      <!-- WRAP STACKING -->
      {#if Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap")
        .find(inv => inv[1].type === "stacking")}
        <div class="farm-title">WRAP Stacking</div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap")
        .filter(inv => inv[1].type === "stacking") as [invName, invData] (invData.id)}
        <WrapRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:update-stake={event => {
            const { id, balance } = event.detail;
            const newInvestments = { ...$store.investments };
            newInvestments[id].balance = balance;
            store.updateInvestments(newInvestments);
          }}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
      <!-- LIQUIDITY MINING -->
      {#if Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap")
        .find(inv => inv[1].type === "staking")}
        <div class="farm-title">Liquidity Mining</div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap")
        .filter(inv => inv[1].type === "staking") as [invName, invData] (invData.id)}
        <WrapRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:update-stake={event => {
            const { id, balance } = event.detail;
            const newInvestments = { ...$store.investments };
            newInvestments[id].balance = balance;
            store.updateInvestments(newInvestments);
          }}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
      <!-- FEE FARMING -->
      {#if Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap")
        .find(inv => inv[1].type === "fee-farming")}
        <div class="farm-title">Fee Farming</div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap")
        .filter(inv => inv[1].type === "fee-farming") as [invName, invData]}
        <WrapRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:update-stake={event => {
            const { id, balance } = event.detail;
            const newInvestments = { ...$store.investments };
            newInvestments[id].balance = balance;
            store.updateInvestments(newInvestments);
          }}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
      {#if $localStorageStore.favoriteInvestments && $localStorageStore.favoriteInvestments.length > 0 && $localStorageStore.favoriteInvestments.filter( inv => inv.includes("WRAP") ).length > 0}
        <div class="row-footer">
          <div style="grid-column: 1 / span 2">
            <button
              class="primary"
              on:click={async () => await findStakes("wrap")}
            >
              <span class="material-icons"> search </span>
              Find my stakes
            </button>
          </div>
          {#if availableRewards.filter(rw => rw.platform === "wrap").length > 0}
            <div class="total-rewards" id="total-wrap-rewards">
              Total rewards: {formatTokenAmount(totalWrapRewards)} WRAP
              <br />
              <span style="font-size:0.7rem">
                ({+(totalWrapRewards * $store.tokens.WRAP.exchangeRate).toFixed(
                  5
                ) / 1} ꜩ / {+(
                  totalWrapRewards *
                  $store.tokens.WRAP.exchangeRate *
                  $store.xtzData.exchangeRate
                ).toFixed(2) / 1}
                {$localStorageStore.preferredFiat || "USD"})
              </span>
            </div>
            <div style="display:flex;justify-content:center">
              {#if harvestingAllWrap}
                <button class="primary loading">
                  Harvesting <span class="material-icons"> sync </span>
                </button>
              {:else}
                <!-- Harvest button states -->
                {#if harvestingAllWrapSuccess === true}
                  <button class="primary success"> Harvested! </button>
                {:else if harvestingAllWrapSuccess === false}
                  <button class="mini error" on:click={harvestAllWrap}>
                    Retry
                  </button>
                {:else}
                  <button class="primary" on:click={harvestAllWrap}>
                    <span class="material-icons"> agriculture </span>&nbsp;
                    Harvest all
                  </button>
                {/if}
              {/if}
            </div>
          {:else}
            <div />
          {/if}
        </div>
      {/if}
      <!-- KDAO FARMS -->
      {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "kdao").length > 0}
        <div class="row-header">
          <div style="grid-column: 1 / span 2">kDAO Farms</div>
        </div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "kdao")
        .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
        <KdaoRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          {createTooltipContent}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
        />
      {/each}
      <!-- PAUL FARMS -->
      {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "paul").length > 0}
        <div class="row-header">
          <div style="grid-column: 1 / span 2">Alien's Farms</div>
        </div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "paul")
        .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
        <PaulRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
    </div>
    {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "paul").length > 0}
      <div class="row-footer">
        <div style="grid-column: 1 / span 2">
          <button
            class="primary"
            on:click={async () => await findStakes("paul")}
          >
            <span class="material-icons"> search </span>
            Find my stakes
          </button>
        </div>
        {#if availableRewards.filter(rw => rw.platform === "paul").length > 0}
          <div class="total-rewards" id="total-paul-rewards">
            Total rewards: {formatTokenAmount(totalPaulRewards)} PAUL
            <br />
            <span style="font-size:0.7rem">
              ({+(totalPaulRewards * $store.tokens.PAUL.exchangeRate).toFixed(
                5
              ) / 1} ꜩ / {+(
                totalPaulRewards *
                $store.tokens.PAUL.exchangeRate *
                $store.xtzData.exchangeRate
              ).toFixed(2) / 1}
              {$localStorageStore.preferredFiat || "USD"})
            </span>
          </div>
          <div style="display:flex;justify-content:center">
            {#if harvestingAllPaul}
              <button class="primary loading">
                Harvesting <span class="material-icons"> sync </span>
              </button>
            {:else}
              <!-- Harvest button states -->
              {#if harvestingAllPaulSuccess === true}
                <button class="primary success"> Harvested! </button>
              {:else if harvestingAllPaulSuccess === false}
                <button class="mini error" on:click={harvestAllPaul}>
                  Retry
                </button>
              {:else}
                <button class="primary" on:click={harvestAllPaul}>
                  <span class="material-icons"> agriculture </span>&nbsp;
                  Harvest all
                </button>
              {/if}
            {/if}
          </div>
        {:else}
          <div />
        {/if}
      </div>
    {/if}
    {#if $store.investments["YOUVES-UUSD-UBTC"].balance && $store.investments["YOUVES-UUSD-UBTC"].balance > 0}
      <div class="row-header">
        <div style="grid-column: 1 / span 2">Youves Farms</div>
      </div>
      {#each Object.entries($store.investments)
        .filter(inv => inv[1].platform === "youves")
        .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
        <YouvesRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
    {/if}
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <!-- SMAK FARMS -->
      {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "smak").length > 0}
        <div class="row-header">
          <div style="grid-column: 1 / span 2">SMAK Farms</div>
        </div>
      {/if}
      {#each Object.entries($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "smak")
        .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
        <SmakRow
          rewards={availableRewards.find(rw => rw.id === invData.id)}
          {invName}
          {invData}
          on:update-farm-value={event =>
            (totalValueInFarms = [
              ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
              event.detail
            ])}
          on:reset-rewards={event => resetRewards(event.detail)}
          on:farm-apr={event => sortFarmsByApr(event.detail)}
          on:roi-per-week={event =>
            (totalRoiPerWeek[invData.id] = event.detail)}
        />
      {/each}
    {/if}
  {/if}
  <br />
  <div>
    <InvestmentSpread {totalValueInFarms} />
  </div>
  <br />
  <div>
    <PlentyTotalRewards />
  </div>
  <br />
  {#if unstakedLpTokens.length > 0}
    <div style="font-size:1.4rem">Information</div>
    <br />
    <div style="font-size:1.1rem">Unstaked LP tokens</div>
    <div>
      {#each unstakedLpTokens as item}
        {#if $store.investments.hasOwnProperty(item[0])}
          <div class="unstaked-token">
            <div>
              <div class="icon">
                {#each $store.investments[item[0]].icons as icon}
                  <img src={`images/${icon}.png`} alt="token-icon" />
                {/each}
              </div>
            </div>
            <div>
              <a
                href={`https://better-call.dev/mainnet/${item[1]}/operations`}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {$store.investments[item[0]].alias}
              </a>
            </div>
            <div>{item[2]} tokens</div>
          </div>
        {/if}
      {:else}
        No token found
      {/each}
    </div>
    <br />
  {/if}
  {#if farmAprs.length > 0}
    <div style="font-size:1.1rem">Best APRs</div>
    <div>
      {#each farmAprs.slice(0, 7) as farm}
        <div class="best-farm-apr">
          <div class="icon">
            {#each $store.investments[farm.id].icons as icon}
              <img src={`images/${icon}.png`} alt="token-icon" />
            {/each}
          </div>
          <div>
            {$store.investments[farm.id].alias}
          </div>
          <div>
            {+farm.apr.toFixed(3) / 1} %
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
{#if selectFarmModal}
  <Modal type="default" on:close={() => (selectFarmModal = null)}>
    <div slot="modal-title" class="modal-title">
      {#if selectFarmModal === "plenty"}
        <div>Plenty farms</div>
      {:else if selectFarmModal === "wrap"}
        <div>Wrap farms</div>
      {:else if selectFarmModal === "paul"}
        <div>Paul farms</div>
      {:else if selectFarmModal === "kdao"}
        <div>kDAO farms</div>
      {:else if selectFarmModal === "smak"}
        <div>SMAK farms</div>
      {/if}
    </div>
    <div
      slot="modal-body"
      class="modal-body"
      style="justify-content:flex-start"
    >
      <div class="farm-selection-modal">
        {#if $localStorageStore.favoriteInvestments && $localStorageStore.favoriteInvestments.length > 0}
          <!-- favorite farms -->
          <div style="width:100%;font-size:0.9rem">Favorite</div>
          {#each sortFarmSelectModal($localStorageStore.favoriteInvestments, true, selectFarmModal) as inv (inv[1].id)}
            <div
              class="farm-to-select favorite"
              on:click={async () => removeFavoriteInvestment(inv[0])}
            >
              <div class="small-icons">
                {#each inv[1].icons as icon}
                  <img src={`images/${icon}.png`} alt={`${icon}-token`} />
                {/each}
              </div>
              {inv[1].alias}
            </div>
          {/each}
        {/if}
      </div>
      <br />
      <div class="farm-selection-modal">
        <!-- other farms -->
        {#if selectFarmModal === "wrap"}
          {#if !$localStorageStore.favoriteInvestments.includes("WRAP-STACKING")}
            <div style="width:100%;font-size:0.9rem">WRAP stacking</div>
            <div
              class="farm-to-select"
              on:click={async () => addFavoriteInvestment("WRAP-STACKING")}
            >
              <div class="small-icons">
                <img src={`images/WRAP.png`} alt="WRAP-token" />
              </div>
              Wrap Stacking
            </div>
          {/if}
          {#each sortFarmSelectModal($localStorageStore.favoriteInvestments, false, selectFarmModal, "staking") as inv, index (inv[1].id)}
            {#if index === 0}
              <div style="width:100%;font-size:0.9rem">Liquidity mining</div>
            {/if}
            <div
              class="farm-to-select"
              on:click={async () => addFavoriteInvestment(inv[0])}
            >
              <div class="small-icons">
                {#each inv[1].icons as icon}
                  <img src={`images/${icon}.png`} alt={`${icon}-token`} />
                {/each}
              </div>
              {inv[1].alias}
            </div>
          {/each}
          {#each sortFarmSelectModal($localStorageStore.favoriteInvestments, false, selectFarmModal, "fee-farming") as inv, index}
            {#if index === 0}
              <div style="width:100%;font-size:0.9rem">Fee Farming</div>
            {/if}
            <div
              class="farm-to-select"
              on:click={async () => addFavoriteInvestment(inv[0])}
            >
              <div class="small-icons">
                {#each inv[1].icons as icon}
                  <img src={`images/${icon}.png`} alt={`${icon}-token`} />
                {/each}
              </div>
              {inv[1].alias}
            </div>
          {/each}
        {:else}
          <div style="width:100%;font-size:0.9rem">Available</div>
          {#each sortFarmSelectModal($localStorageStore.favoriteInvestments, false, selectFarmModal) as inv (inv[1].id)}
            <div
              class="farm-to-select"
              on:click={async () => addFavoriteInvestment(inv[0])}
            >
              <div class="small-icons">
                {#each inv[1].icons as icon}
                  <img src={`images/${icon}.png`} alt={`${icon}-token`} />
                {/each}
              </div>
              {inv[1].alias}
            </div>
          {/each}
        {/if}
      </div>
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <button
        class="primary"
        on:click={() => {
          selectFarmModal = null;
        }}
      >
        <span class="material-icons"> close </span>
        Close
      </button>
    </div>
  </Modal>
{/if}
{#if searchingForStakes}
  <Modal type="default" on:close={() => (searchingForStakes = false)}>
    <div slot="modal-title" class="modal-title">
      Existing stakes for {searchingForStakesPlatform.toUpperCase()}
    </div>
    <div slot="modal-body" class="modal-body">
      {#if loadingSearchingForStakes}
        <div>Loading, please wait...</div>
      {:else}
        {#each foundStakes as stake}
          <div class="modal-find-stakes-line">
            <div style="text-align: left">{stake.name}</div>
            <div style="text-align: center">
              {stake.balance} tokens
            </div>
            <div style="text-align: right">
              {#if $localStorageStore.favoriteInvestments && $localStorageStore.favoriteInvestments.includes(stake.id)}
                <button class="mini">
                  <span class="material-icons"> check_circle_outline </span>
                </button>
              {:else}
                <button
                  class="mini"
                  on:click={() => addFavoriteInvestment(stake.id)}
                >
                  <span class="material-icons"> add_circle </span>
                </button>
              {/if}
            </div>
          </div>
        {:else}
          <div>No stake found</div>
        {/each}
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <button
        class="primary"
        on:click={() => {
          searchingForStakes = false;
        }}
      >
        <span class="material-icons"> close </span>
        Close
      </button>
    </div>
  </Modal>
{/if}
