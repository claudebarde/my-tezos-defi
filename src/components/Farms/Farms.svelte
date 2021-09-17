<script lang="ts">
  import { afterUpdate } from "svelte";
  import { fly } from "svelte/transition";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import {
    loadInvestment,
    getPlentyReward,
    getPaulReward,
    getKdaoReward,
    prepareOperation
  } from "../../utils";
  import type { AvailableInvestments } from "../../types";
  import { AvailableToken } from "../../types";
  import Row from "./Row.svelte";

  let showPlentyFarms = false;
  let showPaulFarms = false;
  let showKdaoFarms = false;
  let plentyValueInXtz = true;
  let kdaoValueInXtz = true;
  let paulValueInXtz = true;
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

  afterUpdate(async () => {
    // calculates available rewards
    if (
      $localStorageStore &&
      $store.investments &&
      $store.lastOperations.length > 0 &&
      lastRewardsCheck + 6000 < Date.now()
    ) {
      lastRewardsCheck = Date.now();

      const investmentData = $localStorageStore.favoriteInvestments
        .map(inv => $store.investments[inv])
        .filter(
          inv =>
            inv.platform === "plenty" ||
            inv.platform === "paul" ||
            inv.platform === "kdao"
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
        } else if (rw.platform === "kdao") {
          tempRw.amount =
            tempRw.amount.toNumber() / 10 ** $store.tokens.kDAO.decimals;
        }

        availableRewards = [
          ...availableRewards.filter(arw => arw.id !== rw.id),
          tempRw
        ];
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
      justify-content: space-around;
      align-items: center;

      #plenty-farms {
        position: relative;
        height: 60px;

        .select-plenty-farms {
          z-index: 100;
          width: 440px;
          min-height: 200px;
          border: none;
          border-radius: 10px;
          position: absolute;
          top: 70px;
          left: -100px;
          display: flex;
          flex-wrap: wrap;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
            rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
          background-color: white;
        }
      }

      #paul-farms {
        position: relative;
        height: 60px;

        .select-paul-farms {
          z-index: 100;
          width: 440px;
          min-height: 200px;
          border: none;
          border-radius: 10px;
          position: absolute;
          top: 70px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
            rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
          background-color: white;
        }
      }

      #kdao-farms {
        position: relative;
        height: 60px;

        .select-kdao-farms {
          z-index: 100;
          width: 440px;
          min-height: 200px;
          border: none;
          border-radius: 10px;
          position: absolute;
          top: 70px;
          right: -100px;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px,
            rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
          background-color: white;
        }
      }
    }

    .farm-to-select {
      padding: 5px;
      margin: 5px;
      font-size: 0.9rem;
      transition: 0.3s;
      border: solid 2px transparent;
      border-radius: 10px;
      cursor: pointer;

      &:hover {
        background-color: lighten($container-bg-color, 60);
      }

      &.favorite {
        border-color: lighten($container-bg-color, 60);
      }
    }

    .row-header,
    .row-footer {
      display: grid;
      grid-template-columns: 10% 25% 20% 17% 16% 12%;
      padding: 5px 10px;
      align-items: center;
      color: white;
      padding: 10px;
    }
    .row-header {
      background-color: darken($container-bg-color, 3);
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
          showPlentyFarms = !showPlentyFarms;
          showPaulFarms = false;
          showKdaoFarms = false;
        }}
      >
        <img src={$store.tokens.PLENTY.thumbnail} alt="Plenty" />
        &nbsp; Plenty
        <span class="material-icons"> arrow_drop_down </span>
      </button>
      {#if showPlentyFarms}
        <div
          class="select-plenty-farms"
          transition:fly={{ duration: 400, y: 100 }}
        >
          {#each Object.entries($store.investments)
            .filter(inv => inv[1].platform === "plenty")
            .sort((a, b) => a[0]
                .toLowerCase()
                .localeCompare(b[0].toLowerCase())) as inv}
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
              {inv[1].alias}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <div id="paul-farms">
      <button
        class="primary"
        on:click={() => {
          showPaulFarms = !showPaulFarms;
          showPlentyFarms = false;
          showKdaoFarms = false;
        }}
      >
        <img src={$store.tokens.PAUL.thumbnail} alt="Paul" />
        &nbsp; Paul
        <span class="material-icons"> arrow_drop_down </span>
      </button>
      {#if showPaulFarms}
        <div
          class="select-paul-farms"
          transition:fly={{ duration: 400, y: 100 }}
        >
          {#each Object.entries($store.investments)
            .filter(inv => inv[1].platform === "paul")
            .sort((a, b) => a[0]
                .toLowerCase()
                .localeCompare(b[0].toLowerCase())) as inv}
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
              {inv[1].alias}
            </div>
          {/each}
        </div>
      {/if}
    </div>
    <div id="kdao-farms">
      <button
        class="primary"
        on:click={() => {
          showKdaoFarms = !showKdaoFarms;
          showPlentyFarms = false;
          showPaulFarms = false;
        }}
      >
        <img src={$store.tokens.kDAO.thumbnail} alt="kDAO" />
        &nbsp; kDAO
        <span class="material-icons"> arrow_drop_down </span>
      </button>
      {#if showKdaoFarms}
        <div
          class="select-kdao-farms"
          transition:fly={{ duration: 400, y: 100 }}
        >
          {#each Object.entries($store.investments)
            .filter(inv => inv[1].platform === "kdao")
            .sort((a, b) => a[0]
                .toLowerCase()
                .localeCompare(b[0].toLowerCase())) as inv}
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
              {inv[1].alias}
            </div>
          {/each}
        </div>
      {/if}
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
    {#each Object.entries($store.investments).filter(inv => $localStorageStore.favoriteInvestments.includes(inv[0]) && inv[1].platform === "plenty") as [invName, invData]}
      <Row
        investment={[invName, invData]}
        valueInXtz={true}
        rewards={availableRewards.find(rw => rw.id === invData.id)}
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
      <div>
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
            <button class="mini" on:click={harvestAll}> Harvest all </button>
          {/if}
        {/if}
      </div>
      <div />
    </div>
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
      <Row
        investment={[invName, invData]}
        valueInXtz={true}
        rewards={availableRewards.find(rw => rw.id === invData.id)}
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
      <Row
        investment={[invName, invData]}
        valueInXtz={true}
        rewards={availableRewards.find(rw => rw.id === invData.id)}
        on:update-farm-value={event =>
          (totalValueInFarms = [
            ...totalValueInFarms.filter(val => val[0] !== event.detail[0]),
            event.detail
          ])}
        on:reset-rewards={event => resetRewards(event.detail)}
      />
    {/each}
  </div>
</section>
