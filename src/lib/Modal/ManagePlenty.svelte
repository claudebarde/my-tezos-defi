<script lang="ts">
  import Modal from "./Modal.svelte";
  import store from "../../store";
  import config from "../../config";
  import { AvailableToken } from "../../types";
  import { getPlentyReward, prepareOperation } from "../../utils";

  export let contractAddress, alias, id;

  let openModal = false;
  let loading = false;
  let balance = 0;
  let plentyXtzLpBalance = 0;
  let body = [];
  let token: AvailableToken;
  let decimals = 18;
  let stakes: {
    id: number;
    amount: number;
    level: number;
    withdrawalFee: number;
  }[] = [];
  let unstakeSelect: { id: number; amount: number }[] = [];
  let rewards = "N/A";
  let tokenForRewards: AvailableToken;
  let harvesting = false;
  let harvestingSuccess = undefined;
  let newStake = "";
  let staking = false;
  let stakingSuccess = undefined;
  let unstaking = false;
  let unstakingSuccess = undefined;

  const generateStakes = investMap => {
    const investMapEntries = investMap.entries();
    let tempStakes = [];
    for (let stake of investMapEntries) {
      // calculates withdrawal fee
      const amount = stake[1].amount.toNumber();
      let withdrawalFee = 0;
      const currentLevel = $store.lastOperations[0].level;
      const stakeLevel = stake[1].level.toNumber();
      const levelsSinceStaking = currentLevel - stakeLevel;
      if (["PLENTY-XTZ-LP", "PLENTY-KALAM"].includes(id)) {
        // zero percent fee after 9 days
        if (
          stakeLevel + config.plentyWithdrawalFeeSchema.zeroPerCent >
          currentLevel
        ) {
          withdrawalFee = (amount * 4) / 100;
        } else {
          withdrawalFee = 0;
        }
      } else {
        for (
          let i = 0;
          i < config.plentyWithdrawalFeeSchema.general.length;
          i++
        ) {
          const [levelThreshold, percentage] =
            config.plentyWithdrawalFeeSchema.general[i];
          if (levelsSinceStaking < levelThreshold) {
            withdrawalFee = (amount * percentage) / 100;
          } else if (withdrawalFee === 0) {
            withdrawalFee = (amount * 4) / 100;
          }
        }
      }
      // saves stake to be displayed
      tempStakes = [
        ...tempStakes,
        {
          id: stake[0],
          amount: amount / 10 ** (id === "PLENTY-XTZ-LP" ? 6 : decimals),
          level: stakeLevel,
          withdrawalFee: withdrawalFee / 10 ** decimals
        }
      ];
    }
    stakes = [...tempStakes];
  };

  const harvest = async () => {
    // harvest tokens from Plenty pool
    harvesting = true;
    try {
      const contract = await $store.Tezos.wallet.at(contractAddress);
      const batch = prepareOperation({
        contractCalls: [contract.methods.GetReward([["unit"]])],
        amount: +rewards,
        tokenSymbol: AvailableToken.PLENTY
      });
      const op = await batch.send();
      await op.confirmation();
      const receipt = await op.receipt();
      harvesting = false;
      if (!receipt) {
        harvestingSuccess = false;
        throw `Operation failed: ${receipt}`;
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

  const stake = async () => {
    // checks if stake is valid
    if (newStake && !isNaN(+newStake)) {
      try {
        staking = true;
        const amountToStake = +newStake * 10 ** decimals;
        // sends transaction
        const plentyContract = await $store.Tezos.wallet.at(contractAddress);
        if (!$store.tokens.hasOwnProperty(token)) throw "Unknown token";
        const tokenContract = $store.tokens[token];
        const tokenContractInstance = await $store.Tezos.wallet.at(
          tokenContract.address
        );
        let approveCall;
        if (tokenContract.type === "fa1.2") {
          approveCall = tokenContractInstance.methods.approve(
            contractAddress,
            amountToStake
          );
        } else if (tokenContract.type === "fa2") {
          approveCall = tokenContractInstance.methods.update_operators([
            {
              add_operator: {
                owner: $store.userAddress,
                operator: contractAddress,
                token_id: tokenContract.tokenId
              }
            }
          ]);
        } else {
          throw "Unknown contract type";
        }
        const batch = prepareOperation({
          contractCalls: [
            approveCall,
            plentyContract.methods.stake(amountToStake)
          ],
          amount: +newStake,
          tokenSymbol: token
        });
        const op = await batch.send();
        await op.confirmation();
        const receipt = await op.receipt();
        staking = false;
        if (!receipt) {
          stakingSuccess = false;
          throw `Operation failed: ${receipt}`;
        } else {
          stakingSuccess = true;
          newStake = "";
          // updates stakes
          const storage: any = await plentyContract.storage();
          const userInfo = await storage.balances.get($store.userAddress);
          if (userInfo) {
            generateStakes(userInfo.InvestMap);
          }
          setTimeout(() => {
            stakingSuccess = undefined;
          }, 2000);
        }
      } catch (error) {
        console.log(error);
      } finally {
        staking = false;
      }
    }
  };

  const unstake = async () => {
    // checks if stake is valid
    if (unstakeSelect.length > 0) {
      try {
        unstaking = true;
        const totalAmountToUnstake = [
          0,
          ...unstakeSelect.map(stk => +stk.amount)
        ].reduce((a, b) => a + b);
        // sends transaction
        const contract = await $store.Tezos.wallet.at(contractAddress);
        const batch = prepareOperation({
          contractCalls: unstakeSelect.map(stk =>
            contract.methods.unstake(+stk.amount * 10 ** decimals, stk.id)
          ),
          amount: totalAmountToUnstake,
          tokenSymbol: token
        });
        const op = await batch.send();
        await op.confirmation();
        const receipt = await op.receipt();
        unstaking = false;
        if (!receipt) {
          unstakingSuccess = false;
          throw `Operation failed: ${receipt}`;
        } else {
          unstakingSuccess = true;
          stakes = [
            ...stakes.filter(
              stk => !unstakeSelect.find(stk_ => stk_.id === stk.id)
            )
          ];
          unstakeSelect = [];
          setTimeout(() => {
            unstakingSuccess = undefined;
          }, 2000);
        }
      } catch (error) {
        console.log(error);
      } finally {
        unstaking = false;
      }
    }
  };

  const openmanageModalInput = async (contractAddress: string) => {
    loading = true;
    body = [];
    rewards = "N/A";
    tokenForRewards = AvailableToken.PLENTY;

    const inv = Object.values($store.investments).find(
      details => details.address === contractAddress
    );
    if (inv.token) {
      decimals = $store.tokens[inv.token].decimals;
      token = inv.token;
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
        unstakeSelect = [];
        generateStakes(userInfo.InvestMap);
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
      }
      // calculates APR and APY
      const tokenPriceInUsd =
        $store.tokensExchangeRates[tokenForRewards].realPriceInTez *
        $store.xtzData.exchangeRate;
      let stakeTokenPriceInUsd;
      if (inv.id === "PLENTY-XTZ-LP") {
        stakeTokenPriceInUsd =
          (inv.shareValueInTez / 10 ** 6) * 2 * $store.xtzData.exchangeRate;
      } else {
        stakeTokenPriceInUsd =
          $store.tokensExchangeRates[inv.token].realPriceInTez *
          $store.xtzData.exchangeRate;
      }
      const apr =
        ((storage.rewardRate.toNumber() * 525600 * tokenPriceInUsd) /
          (storage.totalSupply.toNumber() * stakeTokenPriceInUsd)) *
        100;
      body = [...body, `APR: ${apr.toFixed(2)} %`];
      const apy = ((1 + apr / 100 / 365) ** 365 - 1) * 100;
      body = [...body, `APY: ${apy.toFixed(2)} %`];

      // calculates balances of Plenty-XTZ LP tokens
      if (id === "PLENTY-XTZ-LP") {
        const qlpContract = await $store.Tezos.wallet.at(
          $store.tokens.PLENTY.dexContractAddress
        );
        const qlpStorage: any = await qlpContract.storage();
        const qlpBalance = await qlpStorage.storage.ledger.get(
          $store.userAddress
        );
        if (
          qlpBalance &&
          qlpBalance.balance &&
          qlpBalance.balance.toNumber() > 0
        ) {
          plentyXtzLpBalance = qlpBalance.balance.toNumber();
        } else {
          plentyXtzLpBalance = 0;
        }
      }

      loading = false;
    } else {
      body = ["Unable to find balances in contract"];
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

{#if $store.tokensExchangeRates.PLENTY}
  <button
    class="button investments"
    on:click={async () => {
      openModal = true;
      await openmanageModalInput(contractAddress);
    }}
  >
    Manage
  </button>
{/if}
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
          <div>Total staked: {balance} {token}</div>
          <div>
            Available rewards: {rewards}
            {id === "PLENTY-KALAM" ? "KALAM" : "PLENTY"}
          </div>
          <br />
        {/if}
        <div class="pool-details">
          {#each body as item}
            <div>{item}</div>
          {/each}
        </div>
        <br />
        <div>
          <input
            type="text"
            bind:value={newStake}
            placeholder={token
              ? `Max: ${
                  id === "PLENTY-XTZ-LP"
                    ? plentyXtzLpBalance / 10 ** 6
                    : Math.floor($store.tokensBalances[token] * 1000) / 1000
                }`
              : "ERROR"}
          />
          {#if staking}
            <button class="button mini loading">
              Staking <span class="material-icons"> sync </span>
            </button>
          {:else}
            <!-- Harvest button states -->
            {#if stakingSuccess === true}
              <button class="button mini success"> Staked! </button>
            {:else if stakingSuccess === false}
              <button class="button mini error" on:click={stake}>
                Retry
              </button>
            {:else}
              <button class="button mini" on:click={stake}>
                Stake {stakes.length > 0 ? "more" : ""}
              </button>
            {/if}
          {/if}
        </div>
        <br />
        {#if Array.isArray(stakes)}
          {#each stakes as stake, index (stake.id)}
            <div class="stake-row">
              <div>Stake {index + 1}</div>
              <div>
                {stake.amount}
                {#if token === "PLENTY" && id === "PLENTY-XTZ-LP"}
                  QLP
                {:else if token}
                  {token}
                {:else}
                  --
                {/if}
              </div>
              <div>
                Withdrawal fee: {+stake.withdrawalFee.toFixed(5) / 1}
                {token || "--"}
              </div>
              <div class="unstake-box">
                Unstake
                {#if unstakeSelect.find(stk => stk.id === stake.id)}
                  <span
                    class="material-icons"
                    on:click={() => {
                      unstakeSelect = [
                        ...unstakeSelect.filter(stk => stk.id !== stake.id)
                      ];
                    }}
                  >
                    check_box
                  </span>
                {:else}
                  <span
                    class="material-icons"
                    on:click={() => {
                      unstakeSelect = [
                        { id: stake.id, amount: stake.amount },
                        ...unstakeSelect
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
        {:else}
          <div>No stake in this contract</div>
        {/if}
      {/if}
    </div>
    <div slot="modal-footer" class="modal-footer">
      <div />
      <div class="buttons">
        <button
          class="button secondary"
          on:click={() => {
            openModal = false;
          }}
        >
          Close
        </button>
        {#if Array.isArray(unstakeSelect) && unstakeSelect.length > 0}
          <!-- Harvest button -->
          {#if unstaking}
            <button class="button main loading">
              Unstaking <span class="material-icons"> sync </span>
            </button>
          {:else}
            <!-- Harvest button states -->
            {#if unstakingSuccess === true}
              <button class="button main success"> Unstaked! </button>
            {:else if unstakingSuccess === false}
              <button class="button main error" on:click={unstake}>
                Retry
              </button>
            {:else}
              <button class="button main" on:click={unstake}> Unstake </button>
            {/if}
          {/if}
        {:else if rewards && rewards !== "N/A"}
          <!-- Harvest button -->
          {#if harvesting}
            <button class="button main loading">
              Harvesting <span class="material-icons"> sync </span>
            </button>
          {:else}
            <!-- Harvest button states -->
            {#if harvestingSuccess === true}
              <button class="button main success"> Harvested! </button>
            {:else if harvestingSuccess === false}
              <button class="button main error" on:click={harvest}>
                Retry
              </button>
            {:else}
              <button class="button main" on:click={harvest}> Harvest </button>
            {/if}
          {/if}
        {/if}
      </div>
    </div>
  </Modal>
{/if}
