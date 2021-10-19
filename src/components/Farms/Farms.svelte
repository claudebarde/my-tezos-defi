<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { push } from "svelte-spa-router";
  import tippy from "tippy.js";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import {
    loadInvestment,
    getPlentyReward,
    getPaulReward,
    getKdaoReward,
    getWrapReward,
    prepareOperation,
    formatPlentyLpAmount,
    formatTokenAmount
  } from "../../utils";
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
  import InvestmentSpread from "./InvestmentSpread.svelte";
  import PlentyTotalRewards from "./PlentyTotalRewards.svelte";
  import Modal from "../Modal/Modal.svelte";
  import config from "../../config";

  let plentyValueInXtz = true;
  let kdaoValueInXtz = true;
  let paulValueInXtz = true;
  let wrapValueInXtz = true;
  let readyToHarvest = 0;
  let availableRewards: {
    id: AvailableInvestments;
    platform: string;
    amount: number;
  }[] = [];
  let lastRewardsCheck = 0;
  let totalValueInFarms: [AvailableInvestments, number][] = [];
  let harvestingAll = false;
  let harvestingAllSuccess = undefined;
  let unstakedLpTokens: [AvailableInvestments, string, number][] = [];
  let lastVisit = 0;
  let selectFarmModal: null | InvestmentPlatform = null;

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

  const harvestAll = async () => {
    harvestingAll = true;
    // gets the addresses of pools with rewards to harvest
    let allRewards = (
      await Promise.all(
        Object.values($store.investments)
          .filter(inv => inv.platform === "plenty")
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
      harvestingAll = false;
      if (!receipt) {
        harvestingAllSuccess = false;
        throw `Operation failed: ${receipt}`;
      } else {
        harvestingAllSuccess = true;
        setTimeout(() => {
          harvestingAllSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
    } finally {
      harvestingAll = false;
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
      if (!token1Amount || !token2Amount) {
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
    favorite: boolean,
    platform: InvestmentPlatform,
    type?: string
  ): [string, InvestmentData][] => {
    return Object.entries($store.investments)
      .filter(inv => inv[1].platform === platform)
      .filter(inv =>
        favorite
          ? $localStorageStore.favoriteInvestments.includes(inv[1].id)
          : !$localStorageStore.favoriteInvestments.includes(inv[1].id)
      )
      .filter(inv => (type ? inv[1].type === type : true))
      .sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
  };

  onMount(async () => {
    if (!$store.userAddress) push("/");

    // looks for unstaked LP tokens
    if ($store.Tezos && $store.userAddress && $localStorageStore) {
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
    }

    lastVisit = Date.now();

    // refreshes data
    document.addEventListener("visibilitychange", async () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() > lastVisit + 60_000 * 10
      ) {
        lastVisit = Date.now();
        console.log("refreshes data");
      }
    });
  });

  afterUpdate(async () => {
    // calculates available rewards
    if (
      $localStorageStore &&
      $store.investments &&
      $store.lastOperations.length > 0 &&
      lastRewardsCheck + 10_000 < Date.now()
    ) {
      lastRewardsCheck = Date.now();

      const investmentData = $localStorageStore.favoriteInvestments
        .map(inv => $store.investments[inv])
        .filter(
          inv =>
            inv.platform === "plenty" ||
            inv.platform === "paul" ||
            inv.platform === "kdao" ||
            inv.platform === "wrap"
        );
      const rewards: any = await Promise.all(
        investmentData.map(async inv => {
          let rewards;
          if (inv.platform === "plenty") {
            rewards = await getPlentyReward(
              $store.userAddress,
              inv.address,
              $store.lastOperations[0].level,
              inv.decimals
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

      const totalPlentyRewards = [
        0,
        0,
        ...availableRewards
          .filter(rw => rw.platform === "plenty")
          .map(rw => +rw.amount)
      ].reduce((a, b) => a + b);
      tippy(`#total-plenty-rewards`, {
        content: `<div>${
          +(
            totalPlentyRewards *
            $store.tokens[AvailableToken.PLENTY].exchangeRate
          ).toFixed(5) / 1
        } ꜩ<br />${
          +(
            totalPlentyRewards *
            $store.tokens[AvailableToken.PLENTY].exchangeRate *
            $store.xtzData.exchangeRate
          ).toFixed(5) / 1
        } ${$localStorageStore.preferredFiat || "USD"}</div>`,
        allowHTML: true
      });
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
      padding: 5px 10px;
      align-items: center;
      padding: 10px;
    }
    .row-header {
      background-color: darken($container-bg-color, 3);
      color: white;
    }
    .row-footer {
      color: $container-bg-color;
    }

    .unstaked-token {
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
        ꜩ {totalValueInFarms.length > 0
          ? (
              +[0, ...totalValueInFarms.map(val => val[1])]
                .reduce((a, b) => a + b)
                .toFixed(3) / 1
            ).toLocaleString("en-US")
          : 0}
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
        ꜩ {readyToHarvest
          ? (+readyToHarvest.toFixed(3) / 1).toLocaleString("en-US")
          : 0}
      </div>
      <div>
        {(readyToHarvest
          ? +(readyToHarvest * $store.xtzData.exchangeRate).toFixed(2) / 1
          : 0
        ).toLocaleString("en-US")}
        {$localStorageStore.preferredFiat}
      </div>
    </div>
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
        <img src={$store.tokens.PLENTY.thumbnail} alt="Plenty" />
        &nbsp; Plenty
        <span class="material-icons"> arrow_drop_down </span>
      </button>
    </div>
    {#if window.location.href.includes("localhost") || window.location.href.includes("staging")}
      <div id="wrap-farms">
        <button
          class="primary"
          on:click={() => {
            selectFarmModal = "wrap";
          }}
        >
          <img src={$store.tokens.WRAP.thumbnail} alt="WRAP" />
          &nbsp; WRAP
          <span class="material-icons"> arrow_drop_down </span>
        </button>
      </div>
    {/if}
    <div id="paul-farms">
      <button
        class="primary"
        on:click={() => {
          selectFarmModal = "paul";
        }}
      >
        <img src={$store.tokens.PAUL.thumbnail} alt="Paul" />
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
        <img src={$store.tokens.kDAO.thumbnail} alt="kDAO" />
        &nbsp; kDAO
        <span class="material-icons"> arrow_drop_down </span>
      </button>
    </div>
  </div>
  <br />
  <div class="favorite-investments">
    <!-- PLENTY FARMS -->
    {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty").length > 0}
      <div class="row-header">
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>
          Stake in {kdaoValueInXtz ? "XTZ" : $localStorageStore.preferredFiat}
        </div>
        <div>Reward</div>
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
      .sort((a, b) => sortFarmsPerRewards(a[1], b[1])) as [invName, invData]}
      <PlentyRow
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        {invName}
        {invData}
        valueInXtz={true}
        {createTooltipContent}
        on:update-farm-value={event =>
          (totalValueInFarms = [
            ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
            event.detail
          ])}
        on:reset-rewards={event => resetRewards(event.detail)}
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
      .sort( (a, b) => sortFarmsPerRewards(a[1], b[1]) ) as [invName, invData] (invData.id)}
      <PlentyRow
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        {invName}
        {invData}
        valueInXtz={true}
        {createTooltipContent}
        on:update-farm-value={event =>
          (totalValueInFarms = [
            ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
            event.detail
          ])}
        on:reset-rewards={event => resetRewards(event.detail)}
      />
    {/each}
    <div class="row-footer">
      <div />
      <div />
      <div />
      <div />
      {#if availableRewards.length > 0}
        <div class="total-rewards" id="total-plenty-rewards">
          <span class="material-icons" style="vertical-align:middle">
            point_of_sale
          </span>
          {formatTokenAmount(
            [
              0,
              0,
              ...availableRewards
                .filter(rw => rw.platform === "plenty")
                .map(rw => +rw.amount)
            ].reduce((a, b) => a + b),
            2
          )}
        </div>
      {:else}
        <div />
      {/if}
      <div style="display:flex;justify-content:center">
        {#if harvestingAll}
          <button class="mini loading">
            Harvesting <span class="material-icons"> sync </span>
          </button>
        {:else}
          <!-- Harvest button states -->
          {#if harvestingAllSuccess === true}
            <button class="mini success"> Harvested! </button>
          {:else if harvestingAllSuccess === false}
            <button class="mini error" on:click={harvestAll}> Retry </button>
          {:else}
            <button class="mini" on:click={harvestAll}>
              <span class="material-icons"> agriculture </span>&nbsp; Harvest
              all
            </button>
          {/if}
        {/if}
      </div>
    </div>
    <!-- WRAP FARMS -->
    {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "wrap").length > 0}
      <div class="row-header">
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>
          Stake in {wrapValueInXtz ? "XTZ" : $localStorageStore.preferredFiat}
        </div>
        <div>Reward</div>
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
      .filter(inv => inv[1].type === "stacking") as [invName, invData]}
      <WrapRow
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        {invName}
        {invData}
        valueInXtz={true}
        {createTooltipContent}
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
      .filter(inv => inv[1].type === "staking") as [invName, invData]}
      <WrapRow
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        {invName}
        {invData}
        valueInXtz={true}
        {createTooltipContent}
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
        valueInXtz={true}
        {createTooltipContent}
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
      />
    {/each}
    <!-- KDAO FARMS -->
    {#if Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "kdao").length > 0}
      <div class="row-header">
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>
          Stake in {kdaoValueInXtz ? "XTZ" : $localStorageStore.preferredFiat}
        </div>
        <div>Reward</div>
      </div>
    {/if}
    {#each Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "kdao") as [invName, invData]}
      <KdaoRow
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        {invName}
        {invData}
        valueInXtz={true}
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
        <div />
        <div>Contract</div>
        <div>Stake</div>
        <div>
          Stake in {paulValueInXtz ? "XTZ" : $localStorageStore.preferredFiat}
        </div>
        <div>Reward</div>
      </div>
    {/if}
    {#each Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "paul") as [invName, invData]}
      <PaulRow
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        {invName}
        {invData}
        valueInXtz={true}
        {createTooltipContent}
        on:update-farm-value={event =>
          (totalValueInFarms = [
            ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
            event.detail
          ])}
        on:reset-rewards={event => resetRewards(event.detail)}
      />
    {/each}
  </div>
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
  {/if}
</section>
{#if selectFarmModal}
  <Modal type="default" on:close={() => (selectFarmModal = null)}>
    <div slot="modal-title" class="modal-title">
      {#if selectFarmModal === "plenty"}
        Plenty farms
      {:else if selectFarmModal === "wrap"}
        Wrap farms
      {:else if selectFarmModal === "paul"}
        Paul farms
      {:else if selectFarmModal === "kdao"}
        kDAO farms
      {/if}
    </div>
    <div slot="modal-body" class="modal-body">
      <div class="farm-selection-modal">
        <!-- favorite farms -->
        <div style="width:100%;font-size:0.9rem">Favorite</div>
        {#each sortFarmSelectModal(true, selectFarmModal) as inv}
          <div
            class="farm-to-select"
            class:favorite={$localStorageStore.favoriteInvestments.includes(
              inv[0]
            )}
            on:click={async () => {
              if ($localStorageStore.favoriteInvestments.includes(inv[0])) {
                removeFavoriteInvestment(inv[0]);
              } else {
                addFavoriteInvestment(inv[0]);
              }
            }}
          >
            <div class="small-icons">
              {#each inv[1].icons as icon}
                <img src={`images/${icon}.png`} alt={`${icon}-token`} />
              {/each}
            </div>
            {inv[1].alias}
          </div>
        {/each}
      </div>
      <br />
      <div class="farm-selection-modal">
        <!-- other farms -->
        {#if selectFarmModal === "wrap"}
          {#if !$localStorageStore.favoriteInvestments.includes("WRAP-STACKING")}
            <div style="width:100%;font-size:0.9rem">WRAP stacking</div>
            <div
              class="farm-to-select"
              on:click={async () => {
                if (
                  $localStorageStore.favoriteInvestments.includes(
                    "WRAP-STACKING"
                  )
                ) {
                  removeFavoriteInvestment("WRAP-STACKING");
                } else {
                  addFavoriteInvestment("WRAP-STACKING");
                }
              }}
            >
              <div class="small-icons">
                <img src={`images/WRAP.png`} alt="WRAP-token" />
              </div>
              Wrap Stacking
            </div>
          {/if}
          {#each sortFarmSelectModal(false, selectFarmModal, "staking") as inv, index}
            {#if index === 0}
              <div style="width:100%;font-size:0.9rem">Liquidity mining</div>
            {/if}
            <div
              class="farm-to-select"
              class:favorite={$localStorageStore.favoriteInvestments.includes(
                inv[0]
              )}
              on:click={async () => {
                if ($localStorageStore.favoriteInvestments.includes(inv[0])) {
                  removeFavoriteInvestment(inv[0]);
                } else {
                  addFavoriteInvestment(inv[0]);
                }
              }}
            >
              <div class="small-icons">
                {#each inv[1].icons as icon}
                  <img src={`images/${icon}.png`} alt={`${icon}-token`} />
                {/each}
              </div>
              {inv[1].alias}
            </div>
          {/each}
          {#each sortFarmSelectModal(false, selectFarmModal, "fee-farming") as inv, index}
            {#if index === 0}
              <div style="width:100%;font-size:0.9rem">Fee Farming</div>
            {/if}
            <div
              class="farm-to-select"
              class:favorite={$localStorageStore.favoriteInvestments.includes(
                inv[0]
              )}
              on:click={async () => {
                if ($localStorageStore.favoriteInvestments.includes(inv[0])) {
                  removeFavoriteInvestment(inv[0]);
                } else {
                  addFavoriteInvestment(inv[0]);
                }
              }}
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
          {#each sortFarmSelectModal(false, selectFarmModal) as inv}
            <div
              class="farm-to-select"
              class:favorite={$localStorageStore.favoriteInvestments.includes(
                inv[0]
              )}
              on:click={async () => {
                if ($localStorageStore.favoriteInvestments.includes(inv[0])) {
                  removeFavoriteInvestment(inv[0]);
                } else {
                  addFavoriteInvestment(inv[0]);
                }
              }}
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
        Close
      </button>
    </div>
  </Modal>
{/if}
