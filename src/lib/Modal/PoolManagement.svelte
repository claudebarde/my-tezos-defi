<script lang="ts">
  import Modal from "./Modal.svelte";
  import store from "../../store";
  import config from "../../config";
  import type { AvailableToken } from "../../types";
  import { getPlentyReward } from "../../utils";

  export let contractAddress, alias;

  let openModal = false;
  let loading = false;
  let balance = 0;
  let body = [];
  let token: AvailableToken;
  let stakes: {
    id: number;
    amount: number;
    level: number;
    withdrawalFee: number;
  }[] = [];
  let unstake: number[] = [];
  let rewards = "N/A";
  let harvesting = false;
  let harvestingSuccess = undefined;

  const harvest = async () => {
    // harvest tokens from Plenty pool
    try {
      const contract = await $store.Tezos.wallet.at(contractAddress);
      const op = await contract.methods.GetReward([["unit"]]).send();
      harvesting = true;
      await op.confirmation();
      const opStatus = await op.status();
      if (opStatus !== "applied") {
        harvestingSuccess = false;
        throw `Operation status: ${opStatus}`;
      } else {
        harvestingSuccess = true;
        rewards = "0";
        setTimeout(() => {
          harvestingSuccess = undefined;
        }, 2000);
      }
    } catch (error) {
      console.log(error);
    } finally {
      harvesting = false;
    }
  };

  const openmanageModalInput = async (
    contractAddress: string,
    alias: string
  ) => {
    loading = true;
    // PLENTY FARMS/POOLS
    if (alias.slice(0, 6).toLowerCase() === "plenty") {
      const inv = Object.values($store.investments).find(
        details => details.address[$store.network] === contractAddress
      );
      let decimals = 18;
      if (inv.token) {
        decimals = $store.tokens[inv.token].decimals;
      }

      const contract = await $store.Tezos.wallet.at(contractAddress);
      const storage: any = await contract.storage();
      // looks for user's info
      const userInfo = await storage.balances.get($store.userAddress);
      if (userInfo) {
        // displays balances
        balance = userInfo.balance.toNumber() / 10 ** inv.decimals;

        // displays different stakes
        if (userInfo.InvestMap.size > 0) {
          stakes = [];
          unstake = [];
          token = inv.token;

          const investMapEntries = userInfo.InvestMap.entries();
          for (let stake of investMapEntries) {
            // calculates withdrawal fee
            const amount = stake[1].amount.toNumber();
            let withdrawalFee = 0;
            const currentLevel = $store.lastOperations[0].level;
            const stakeLevel = stake[1].level.toNumber();
            const levelsSinceStaking = currentLevel - stakeLevel;
            for (let i = 0; i < config.plentyWithdrawalFeeSchema.length; i++) {
              const [levelThreshold, percentage] =
                config.plentyWithdrawalFeeSchema[i];
              if (levelsSinceStaking < levelThreshold) {
                withdrawalFee = (amount * percentage) / 100;
              } else if (withdrawalFee === 0) {
                withdrawalFee = (amount * 4) / 100;
              }
            }
            // saves stake to be displayed
            stakes = [
              ...stakes,
              {
                id: stake[0],
                amount: amount / 10 ** decimals,
                level: stakeLevel,
                withdrawalFee: withdrawalFee / 10 ** decimals
              }
            ];
          }
          // calculates APR and APY
          const tokenPriceInUsd =
            $store.tokensExchangeRates.PLENTY.realPriceInTez *
            $store.xtzData.exchangeRate;
          const stakeTokenPriceInUsd =
            $store.tokensExchangeRates[inv.token].realPriceInTez *
            $store.xtzData.exchangeRate;
          const apr =
            ((storage.rewardRate.toNumber() * 525600 * tokenPriceInUsd) /
              (storage.totalSupply.toNumber() * stakeTokenPriceInUsd)) *
            100;
          body = [...body, `APR: ${apr.toFixed(2)} %`];
          const apy = ((1 + apr / 100 / 365) ** 365 - 1) * 100;
          body = [...body, `APY: ${apy.toFixed(2)} %`];
          // calculates the rewards
          const getRewards = await getPlentyReward(
            $store.userAddress,
            contractAddress,
            $store.lastOperations[0].level,
            inv.decimals
          );
          if (getRewards.status) {
            rewards = getRewards.totalRewards.toFixed(5);
          } else {
            rewards = "N/A";
          }

          loading = false;
        }
      } else {
        body = ["Unable to find balances in contract"];
        loading = false;
      }
    } else {
      body = ["Unable to use this contract"];
      loading = false;
    }
  };
</script>

<style lang="scss">
  .pool-details {
    width: 80%;
    display: flex;
    justify-content: space-around;

    div {
      margin: 4px;
    }
  }

  .stake-row {
    display: grid;
    grid-template-columns: 15% 20% 45% 20%;
    align-items: center;
    width: 100%;
    padding: 5px;

    .unstake-box {
      .material-icons {
        vertical-align: bottom;
        cursor: pointer;
      }
    }
  }
</style>

<button
  class="button investments"
  on:click={async () => {
    openModal = true;
    await openmanageModalInput(contractAddress, alias);
  }}
>
  Manage
</button>
{#if openModal}
  <Modal type="manage" on:close={() => (openModal = false)}>
    <div slot="modal-title" class="modal-title">
      {alias}
    </div>
    <div slot="modal-body" class="modal-body">
      {#if loading}
        <div>Loading...</div>
      {:else}
        {#if balance && token}
          <div>Your balance: {balance} {token}</div>
          <br />
        {/if}
        <div class="pool-details">
          {#if body && body.length > 1}
            <div>
              {#each body as item}
                <div>{item}</div>
              {/each}
            </div>
            <div>
              <div>Current rewards: {rewards}</div>
              <div>
                {#if harvesting}
                  <button class="button mini loading">
                    Harvesting <span class="material-icons"> sync </span>
                  </button>
                {:else}
                  <!-- Harvest button states -->
                  {#if harvestingSuccess === true}
                    <button class="button mini success" on:click={harvest}>
                      Harvested!
                    </button>
                  {:else if harvestingSuccess === false}
                    <button class="button mini error" on:click={harvest}>
                      Retry
                    </button>
                  {:else}
                    <button class="button mini" on:click={harvest}>
                      Harvest
                    </button>
                  {/if}
                {/if}
                <button class="button mini"> Stake more </button>
              </div>
            </div>
          {/if}
        </div>
        <br />
        {#if Array.isArray(stakes)}
          {#each stakes as stake, index}
            <div class="stake-row">
              <div>Stake {index + 1}</div>
              <div>{stake.amount} {token || "--"}</div>
              <div>
                Withdrawal fee: {stake.withdrawalFee}
                {token || "--"}
              </div>
              <div class="unstake-box">
                Unstake
                {#if unstake.includes(stake.id)}
                  <span
                    class="material-icons"
                    on:click={() => {
                      unstake = [...unstake.filter(id => id !== stake.id)];
                    }}
                  >
                    check_box
                  </span>
                {:else}
                  <span
                    class="material-icons"
                    on:click={() => {
                      unstake = [stake.id, ...unstake];
                    }}
                  >
                    check_box_outline_blank
                  </span>
                {/if}
              </div>
            </div>
          {:else}
            <div>No stake in this contract</div>
          {/each}
        {/if}
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      {#if Array.isArray(unstake) && unstake.length > 0}
        <div class="fee-disclaimer">
          You can help My Tezos Defi by adding a little fee on top of the
          transaction: <br />
          3% <span class="material-icons"> check_box </span>
          1% <span class="material-icons"> check_box_outline_blank </span>
          No fee <span class="material-icons"> check_box_outline_blank </span>
        </div>
      {:else}
        <div />
      {/if}
      <div class="buttons">
        <button
          class="button default"
          on:click={() => {
            openModal = false;
          }}
        >
          Close
        </button>
        {#if Array.isArray(unstake) && unstake.length > 0}
          <button
            class="button default"
            on:click={() => {
              openModal = false;
            }}
          >
            Unstake
          </button>
        {/if}
      </div>
    </div>
  </Modal>
{/if}
<!--
{#if manageModalInput.open}
  <Modal type="manage" on:close={() => (manageModalInput.open = false)}>
    <div slot="modal-title" class="modal-title">
      {manageModalInput.title}
    </div>
    <div slot="modal-body" class="modal-body">
      <PoolManagement {manageModalInput} />
    </div>
    <div slot="modal-footer" class="modal-footer">
      {#if Array.isArray(manageModalInput.unstake) && manageModalInput.unstake.length > 0}
        <div class="fee-disclaimer">
          You can help My Tezos Defi by adding a little fee on top of the
          transaction: <br />
          3% <span class="material-icons"> check_box </span>
          1% <span class="material-icons"> check_box_outline_blank </span>
          No fee <span class="material-icons"> check_box_outline_blank </span>
        </div>
      {:else}
        <div />
      {/if}
      <div class="buttons">
        <button
          class="button default"
          on:click={() => {
            manageModalInput.open = false;
          }}
        >
          Close
        </button>
        {#if Array.isArray(manageModalInput.unstake) && manageModalInput.unstake.length > 0}
          <button
            class="button default"
            on:click={() => {
              manageModalInput.open = false;
            }}
          >
            Unstake
          </button>
        {/if}
      </div>
    </div>
  </Modal>
{/if}
{#if manageModalInput.loading}
  <div>Loading...</div>
{:else}
  {#if manageModalInput.balance && manageModalInput.token}
    <div>Your balance: {manageModalInput.balance} {manageModalInput.token}</div>
    <br />
  {/if}
  <div class="pool-details">
    {#if manageModalInput.body && manageModalInput.body.length > 1}
      <div>
        {#each manageModalInput.body as item}
          <div>{item}</div>
        {/each}
      </div>
      <div>
        <div>Current rewards:</div>
        <div>
          <button class="button default">Stake</button>
        </div>
      </div>
    {/if}
  </div>
  <br />
  {#if Array.isArray(manageModalInput.stakes)}
    {#each manageModalInput.stakes as stake, index}
      <div class="stake-row">
        <div>Stake {index + 1}</div>
        <div>{stake.amount} {manageModalInput.token || "--"}</div>
        <div>
          Withdrawal fee: {stake.withdrawalFee}
          {manageModalInput.token || "--"}
        </div>
        <div class="unstake-box">
          Unstake
          {#if manageModalInput.unstake.includes(stake.id)}
            <span
              class="material-icons"
              on:click={() => {
                manageModalInput.unstake = [
                  ...manageModalInput.unstake.filter(id => id !== stake.id)
                ];
              }}
            >
              check_box
            </span>
          {:else}
            <span
              class="material-icons"
              on:click={() => {
                manageModalInput.unstake = [
                  stake.id,
                  ...manageModalInput.unstake
                ];
              }}
            >
              check_box_outline_blank
            </span>
          {/if}
        </div>
      </div>
    {:else}
      <div>No stake in this contract</div>
    {/each}
  {/if}
{/if}
-->
