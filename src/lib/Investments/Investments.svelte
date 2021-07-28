<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import store from "../../store";
  import toastStore from "../Toast/toastStore";
  import localStorageStore from "../../localStorage";
  import {
    getKolibriOvens,
    getPlentyReward,
    getPaulReward,
    getKdaoReward,
    prepareOperation,
    loadInvestment
  } from "../../utils";
  import type { KolibriOvenData, AvailableInvestments } from "../../types";
  import { AvailableToken } from "../../types";
  import Row from "./Row.svelte";
  import InfoRow from "./InfoRow.svelte";

  let loading = true;
  let kolibriOvens: KolibriOvenData[] = [];
  let kolibriOvensChecked = false;
  let plentyValueInXtz = true;
  let readyRewards = {};
  let showEmptyPlentyPools = false;
  let harvestingAll = false;
  let harvestingAllSuccess = undefined;
  let paulValueInXtz = true;
  let kdaoValueInXtz = true;
  let lastRewardsCheck = 0;
  let availableRewards: {
    id: AvailableInvestments;
    platform: string;
    amount: number;
  }[] = [];

  const shortenHash = (hash: string): string =>
    hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";

  const harvestAll = async () => {
    harvestingAll = true;
    // gets the addresses of pools with rewards to harvest
    let allRewards = [];
    if (showEmptyPlentyPools) {
      allRewards = (
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
      ).filter(res => res.rewards.status);
    } else {
      allRewards = Object.entries(readyRewards).map(item => ({
        address: item[0],
        rewards: { totalRewards: item[1] }
      }));
    }
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
        readyRewards = {};
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

  onMount(async () => {
    // investments have already been loaded
    if (Object.values($store.investments).some(inv => !!inv.balance)) {
      loading = false;
    }

    const investments = await Promise.all(
      Object.values($store.investments)
        .filter(inv => $localStorageStore.favoriteInvestments.includes(inv.id))
        .map(inv => loadInvestment(inv.id))
    );
    if (investments && investments.length > 0) {
      investments.forEach(inv => {
        store.updateInvestments({
          ...$store.investments,
          [inv.id]: {
            ...$store.investments[inv.id],
            balance: inv.balance,
            info: inv.info,
            shareValueInTez:
              inv.id === "PLENTY-XTZ-LP" ? inv.shareValueInTez : undefined
          }
        });
      });
    }

    loading = false;
  });

  afterUpdate(async () => {
    // finds if user has Kolibri ovens
    if ($store.userAddress && !kolibriOvensChecked) {
      const ovens = await getKolibriOvens($store.userAddress, $store.Tezos);
      if (ovens) {
        kolibriOvens = [...ovens];
      } else {
        toastStore.addToast({
          type: "error",
          text: "Couldn't load Kolibri ovens",
          dismissable: false
        });
      }
      kolibriOvensChecked = true;
    }

    // calculates available rewards
    if (
      $localStorageStore &&
      $store.investments &&
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
      rewards.forEach(rw => {
        let tempRw = { ...rw };
        if (rw.platform === "plenty") {
          tempRw.amount = tempRw.amount.totalRewards;
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

  .container-investments {
    padding: 0px;

    .row {
      display: grid;
      grid-template-columns: 10% 25% 20% 17% 17% 11%;
      padding: 5px 10px;
      align-items: center;

      &.header {
        background-color: darken($container-bg-color, 3);

        &:not(:first-child) {
          border-top: solid 4px $border-color;
          margin: 5px 0px;
        }
        &:first-child {
          padding: 10px;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
        }
      }
    }
  }
</style>

<div class="container">
  <div class="title">Investments</div>
  <div class="container-investments">
    {#if $store.investments}
      {#if loading}
        <div class="row">
          <div style="grid-column:1 / span 2">Loading...</div>
        </div>
      {:else}
        {#if kolibriOvens.length > 0 && kolibriOvens.filter(oven => !oven.isLiquidated).length > 0}
          <div class="row header">
            <div />
            <div>Kolibri oven</div>
            <div>Locked</div>
            <div>Borrowed</div>
          </div>
          {#each kolibriOvens as oven}
            {#if !oven.isLiquidated}
              <div class="row">
                <div class="icon">
                  <img src="images/kUSD.png" alt="token-icon" />
                </div>
                <div>
                  <a
                    href={`https://better-call.dev/mainnet/${oven.address}/operations`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {shortenHash(oven.address)}
                  </a>
                </div>
                <div>{+(+oven.locked / 10 ** 6).toFixed(5) / 1} ꜩ</div>
                <div>{+(+oven.borrowed / 10 ** 18).toFixed(5) / 1} kUSD</div>
              </div>
            {/if}
          {/each}
          <div class="row break-line" />
        {/if}
        <!-- wXTZ -->
        {#if $localStorageStore.wXtzVaults.length > 0}
          <div class="row header">
            <div />
            <div>Vault</div>
            <div>Locked</div>
          </div>
          {#each $localStorageStore.wXtzVaults as data}
            <Row {data} platform="wxtz" valueInXtz={true} rewards={undefined} />
          {/each}
        {/if}
        {#if $localStorageStore.favoriteInvestments.length === 0}
          <div class="row">
            <div style="grid-column:1 / span 2">
              No pool or farm in favorites
            </div>
          </div>
        {:else}
          <!-- QUIPUSWAP -->
          {#if Object.entries($store.investments).filter(inv => inv[1].platform === "quipuswap" && inv[1].favorite).length > 0}
            <div class="row header">
              <div />
              <div>Contract</div>
              <div>Tokens</div>
              <div>Value in XTZ</div>
              <div>Value in {$localStorageStore.preferredFiat}</div>
            </div>
            {#each Object.entries($store.investments).filter(inv => inv[1].platform === "quipuswap" && inv[1].favorite) as [contractName, data]}
              <Row
                {data}
                platform={data.platform}
                valueInXtz={true}
                rewards={undefined}
              />
            {/each}
          {/if}
          <!-- PLENTY -->
          {#if Object.entries($store.investments).filter(inv => inv[1].platform === "plenty" && inv[1].favorite).length > 0}
            <div class="row header">
              <div>
                <span
                  class="material-icons"
                  style="vertical-align:middle;cursor:pointer"
                  on:click={() =>
                    (showEmptyPlentyPools = !showEmptyPlentyPools)}
                >
                  {#if showEmptyPlentyPools}
                    visibility_off
                  {:else}
                    visibility
                  {/if}
                </span>
              </div>
              <div>Contract</div>
              <div>Stake</div>
              <div>
                Stake in {plentyValueInXtz
                  ? "XTZ"
                  : $localStorageStore.preferredFiat}
              </div>
              <div>Reward</div>
            </div>
            {#each Object.entries($store.investments)
              .filter(inv => inv[1].platform === "plenty")
              .filter( inv => (showEmptyPlentyPools ? inv : inv[1].favorite) ) as [_, data] (data.alias)}
              <Row
                {data}
                platform={data.platform}
                valueInXtz={plentyValueInXtz}
                rewards={availableRewards.find(rw => rw.id === data.id)}
                on:reset-rewards={event => resetRewards(event.detail)}
              />
            {/each}
            {#if Object.entries($store.investments)
              .filter(inv => inv[1].platform === "plenty")
              .filter(inv => inv[1].balance && inv[1].balance > 0).length > 0}
              <div class="row">
                <div />
                <div />
                <div />
                <div>
                  <button
                    class="button investments"
                    on:click={() => (plentyValueInXtz = !plentyValueInXtz)}
                  >
                    {#if plentyValueInXtz}
                      Show {$localStorageStore.preferredFiat}
                    {:else}
                      Show XTZ
                    {/if}
                  </button>
                </div>
                {#if Object.keys(readyRewards).length === 0}
                  <div />
                {:else}
                  <div>
                    {#if harvestingAll}
                      <button class="button investments loading">
                        Harvesting <span class="material-icons"> sync </span>
                      </button>
                    {:else}
                      <!-- Harvest button states -->
                      {#if harvestingAllSuccess === true}
                        <button class="button investments success">
                          Harvested!
                        </button>
                      {:else if harvestingAllSuccess === false}
                        <button
                          class="button investments error"
                          on:click={harvestAll}
                        >
                          Retry
                        </button>
                      {:else}
                        <button
                          class="button investments"
                          on:click={harvestAll}
                        >
                          Harvest all
                        </button>
                      {/if}
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          {/if}
          <!-- CRUNCHY -->
          {#if Object.values($store.investments)
            .filter(inv => inv.platform === "crunchy")
            .some(data => data.info.some(farm => farm.amount > 0))}
            <div class="row header">
              <div />
              <div>Contract</div>
              <div>Stake</div>
              <div>Stake in XTZ</div>
              <div>Reward</div>
            </div>
            {#each Object.entries($store.investments).filter(inv => inv[1].platform === "crunchy") as [contractName, data]}
              <Row
                {data}
                platform={data.platform}
                valueInXtz={true}
                rewards={undefined}
              />
            {/each}
          {/if}
          <!-- PAUL -->
          {#if Object.entries($store.investments).filter(inv => inv[1].platform === "paul" && inv[1].favorite).length > 0}
            <div class="row header">
              <div />
              <div>Contract</div>
              <div>Stake</div>
              <div>
                Stake in {paulValueInXtz
                  ? "XTZ"
                  : $localStorageStore.preferredFiat}
              </div>
              <div>Reward</div>
            </div>
            {#each Object.entries($store.investments).filter(inv => inv[1].platform === "paul" && inv[1].favorite) as [contractName, data]}
              <Row
                {data}
                platform={data.platform}
                valueInXtz={paulValueInXtz}
                rewards={availableRewards.find(rw => rw.id === data.id)}
                on:reset-rewards={event => resetRewards(event.detail)}
              />
            {/each}
          {/if}
          <!-- KDAO -->
          {#if Object.entries($store.investments).filter(inv => inv[1].platform === "kdao" && inv[1].favorite).length > 0}
            <div class="row header">
              <div />
              <div>Contract</div>
              <div>Stake</div>
              <div>
                Stake in {kdaoValueInXtz
                  ? "XTZ"
                  : $localStorageStore.preferredFiat}
              </div>
              <div>Reward</div>
            </div>
            {#each Object.entries($store.investments).filter(inv => inv[1].platform === "kdao" && inv[1].favorite) as [contractName, data]}
              <Row
                {data}
                platform={data.platform}
                valueInXtz={kdaoValueInXtz}
                rewards={availableRewards.find(rw => rw.id === data.id)}
              />
            {/each}
          {/if}
          <InfoRow {availableRewards} />
        {/if}
      {/if}
    {:else}
      <div>Loading...</div>
    {/if}
  </div>
</div>
