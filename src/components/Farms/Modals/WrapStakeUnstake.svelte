<script lang="ts">
  import { onMount, createEventDispatcher } from "svelte";
  import Modal from "../../Modal/Modal.svelte";
  import type {
    InvestmentData,
    TezosContractAddress,
    TokenAmount
  } from "../../../types";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";
  import toastStore from "../../Toast/toastStore";
  import { calcWrapUnstakingFee } from "../../../tokenUtils/wrapUtils";

  export let type: "stake" | "unstake", invData: InvestmentData;

  const dispatch = createEventDispatcher();
  let loading = false;
  let newStake: {
    token: string | undefined;
    staked: number | undefined;
    available: number | undefined;
  } = {
    token: undefined,
    staked: undefined,
    available: undefined
  };
  let tokensToStake = "";
  let insuffTokensToStake = false;
  let insuffTokensToUnstake = false;
  let newUnstake: { token: string | undefined; balance: number | undefined } = {
    token: undefined,
    balance: undefined
  };
  let tokensToUnstake = "";
  let wrapUnstakingFees:
    | { amount: TokenAmount; fee: TokenAmount; percent: number }[]
    | null;

  const setUpUnstake = async (ev?) => {
    const val = ev ? ev.target.value : newUnstake.balance;
    // non numeric values
    if (isNaN(+val)) {
      tokensToUnstake = "";
      return;
    }
    // value exceeds the tokens already staked
    if (+val > newUnstake.balance) {
      insuffTokensToUnstake = true;
      return;
    } else {
      insuffTokensToUnstake = false;
    }
    // calculates unstaking fee for WRAP stacking
    if (invData.type === "stacking") {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const storage: any = await contract.storage();
      const balance = await storage.ledger.delegators.get($store.userAddress);
      if (balance) {
        let stakes: { level: number; amount: number; index: number }[] = [];
        const entries = balance.stakes.entries();
        for (let entry of entries) {
          stakes.push({
            index: entry[0],
            level: entry[1].level.toNumber(),
            amount:
              entry[1].amount.toNumber() / 10 ** $store.tokens.WRAP.decimals
          });
        }
        stakes = stakes.sort((a, b) => a.level - b.level);
        let stakesForFeeCalculation: {
          stakingLevel: number;
          amount: TokenAmount;
        }[] = [];
        if (
          +tokensToUnstake ===
          balance.balance.toNumber() / 10 ** invData.decimals
        ) {
          // user wants to unstake all their tokens
          stakes.forEach(stake => {
            stakesForFeeCalculation.push({
              stakingLevel: stake.level,
              amount: stake.amount
            });
          });
        } else {
          // user wants to unstake parts of their tokens
          let tempTokensToUnstake = +tokensToUnstake;
          for (let stake of stakes) {
            if (tempTokensToUnstake - stake.amount >= 0) {
              tempTokensToUnstake -= stake.amount;
              stakesForFeeCalculation.push({
                stakingLevel: stake.level,
                amount: stake.amount
              });
            } else {
              stakesForFeeCalculation.push({
                stakingLevel: stake.level,
                amount: stake.amount
              });
              break;
            }
          }
        }
        // calculates fees
        const unstakingFees = calcWrapUnstakingFee(
          $store.currentLevel,
          stakesForFeeCalculation
        );
        if (unstakingFees) {
          wrapUnstakingFees = [...unstakingFees];
        } else {
          wrapUnstakingFees = null;
        }

        /*console.log(
          wrapUnstakingFees
            .map(el => Math.ceil(el.fee * 10 ** $store.tokens.WRAP.decimals))
            .reduce((a, b) => a + b)
        );*/
      }
    }
  };

  const stake = async () => {
    if (!tokensToStake) return;

    loading = true;

    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const storage: any = await contract.storage();
      // gets the address of the LP token contract
      let lpTokenAddress: TezosContractAddress;
      if (invData.type === "staking") {
        lpTokenAddress = storage.addresses.lpTokenContract;
      } else {
        lpTokenAddress = $store.tokens.WRAP.address;
      }
      const lpContract = await $store.Tezos.wallet.at(lpTokenAddress);

      const batch = await $store.Tezos.wallet
        .batch()
        .withContractCall(
          lpContract.methods.update_operators([
            {
              add_operator: {
                owner: $store.userAddress,
                operator: invData.address,
                token_id: 0
              }
            }
          ])
        )
        .withContractCall(
          contract.methods[invData.type === "staking" ? "deposit" : "stake"](
            +tokensToStake * 10 ** invData.decimals
          )
        )
        .withContractCall(
          lpContract.methods.update_operators([
            {
              remove_operator: {
                owner: $store.userAddress,
                operator: invData.address,
                token_id: 0
              }
            }
          ])
        );

      const batchOp = await batch.send();
      await batchOp.confirmation();
      // updates farm balance
      invData = {
        ...invData,
        balance: invData.balance + +tokensToStake
      };
      // updates user balance
      let newBalances = { ...$store.tokensBalances };
      if (invData.type === "stacking") {
        newBalances.WRAP -= +tokensToStake;
      }
      newStake.available -= +tokensToStake;

      toastStore.addToast({
        type: "success",
        title: "Success!",
        text: `Successfully staked ${tokensToStake} ${
          invData.type === "staking" ? "LP tokens" : "WRAP tokens"
        }`,
        dismissable: false,
        icon: "file_download"
      });
    } catch (error) {
      console.error(error);
      toastStore.addToast({
        type: "error",
        title: "Error",
        text: error.hasOwnProperty("message")
          ? error.message
          : JSON.stringify(error),
        dismissable: false
      });
    } finally {
      loading = false;
    }
  };

  const unstake = async () => {
    if (!tokensToUnstake) return;

    loading = true;

    try {
      const contract = await $store.Tezos.wallet.at(invData.address);
      const storage: any = await contract.storage();
      // gets the address of the LP token contract
      let lpTokenAddress: TezosContractAddress;
      if (invData.type === "staking") {
        lpTokenAddress = storage.addresses.lpTokenContract;
      } else {
        lpTokenAddress = $store.tokens.WRAP.address;
      }
      const lpContract = await $store.Tezos.wallet.at(lpTokenAddress);

      // prepares batching operation
      let batch = await $store.Tezos.wallet.batch().withContractCall(
        lpContract.methods.update_operators([
          {
            add_operator: {
              owner: $store.userAddress,
              operator: invData.address,
              token_id: 0
            }
          }
        ])
      );

      // if WRAP stacking farm, must find a stake with enough tokens to subtract
      if (invData.type === "stacking") {
        const balance = await storage.ledger.delegators.get($store.userAddress);
        if (balance) {
          let stakes: { level: number; amount: number; index: number }[] = [];
          const entries = balance.stakes.entries();
          for (let entry of entries) {
            stakes.push({
              index: entry[0],
              level: entry[1].level.toNumber(),
              amount:
                entry[1].amount.toNumber() / 10 ** $store.tokens.WRAP.decimals
            });
          }
          stakes = stakes.sort((a, b) => a.level - b.level);
          if (
            +tokensToUnstake ===
            balance.balance.toNumber() / 10 ** invData.decimals
          ) {
            // user wants to unstake all their tokens
            stakes.forEach(stake => {
              batch = batch.withContractCall(
                contract.methods.withdraw(
                  stake.index,
                  Math.floor(stake.amount * 10 ** invData.decimals)
                )
              );
            });
          } else {
            // user wants to unstake parts of their tokens
            let tempTokensToUnstake = +tokensToUnstake;
            for (let stake of stakes) {
              if (tempTokensToUnstake - stake.amount >= 0) {
                batch = batch.withContractCall(
                  contract.methods.withdraw(
                    stake.index,
                    Math.floor(stake.amount * 10 ** invData.decimals)
                  )
                );
                tempTokensToUnstake -= stake.amount;
              } else {
                batch = batch.withContractCall(
                  contract.methods.withdraw(
                    stake.index,
                    Math.floor(tempTokensToUnstake * 10 ** invData.decimals)
                  )
                );
                break;
              }
            }
          }
        }
      } else {
        batch = batch.withContractCall(
          contract.methods.withdraw(+tokensToUnstake * 10 ** invData.decimals)
        );
      }

      batch = batch.withContractCall(
        lpContract.methods.update_operators([
          {
            remove_operator: {
              owner: $store.userAddress,
              operator: invData.address,
              token_id: 0
            }
          }
        ])
      );

      const batchOp = await batch.send();
      await batchOp.confirmation();
      // updates balance
      invData = {
        ...invData,
        balance: invData.balance - +tokensToUnstake
      };
      toastStore.addToast({
        type: "success",
        title: "Success!",
        text: `Successfully unstaked ${tokensToUnstake} ${
          invData.type === "staking" ? "LP tokens" : "WRAP tokens"
        }`,
        dismissable: false,
        icon: "file_upload"
      });
    } catch (error) {
      console.error(error);
      toastStore.addToast({
        type: "error",
        title: "Error",
        text: error.hasOwnProperty("message")
          ? error.message
          : JSON.stringify(error),
        dismissable: false
      });
    } finally {
      loading = false;
    }
  };

  onMount(async () => {
    if (type === "stake") {
      // staking
      if (["stacking", "staking", "fee-farming"].includes(invData.type)) {
        newStake = {
          token: undefined,
          staked: undefined,
          available: undefined
        };
        tokensToStake = "";
      }

      if (invData.type === "stacking" || invData.type === "fee-farming") {
        // stacking and fee farming
        const contract = await $store.Tezos.wallet.at(
          $store.tokens.WRAP.address
        );
        const storage: any = await contract.storage();
        const balance = await storage.assets.ledger.get($store.userAddress);
        if (balance) {
          newStake = {
            ...newStake,
            token: "WRAP",
            available: balance.toNumber() / 10 ** $store.tokens.WRAP.decimals,
            staked: invData.balance / 10 ** $store.tokens.WRAP.decimals
          };
        } else {
          newStake = {
            ...newStake,
            token: "WRAP",
            available: 0,
            staked: invData.balance / 10 ** $store.tokens.WRAP.decimals
          };
        }
      } else if (invData.type === "staking") {
        // liquidity farming
        const contract = await $store.Tezos.wallet.at(invData.address);
        const storage: any = await contract.storage();
        const { lpTokenContract } = storage.addresses;
        // determines current stake
        const balance = await storage.delegators.get($store.userAddress);
        if (balance) {
          newStake = {
            ...newStake,
            token: "LPT",
            staked: balance.lpTokenBalance.toNumber() / 10 ** invData.decimals
          };
        } else {
          newStake = { ...newStake, token: "LPT", staked: 0 };
        }

        // determines available LP tokens
        const lptContract = await $store.Tezos.wallet.at(lpTokenContract);
        const lptStorage: any = await lptContract.storage();
        const availableBalance = await lptStorage.storage.ledger.get(
          $store.userAddress
        );
        if (availableBalance && availableBalance.balance) {
          newStake = {
            ...newStake,
            available:
              availableBalance.balance.toNumber() / 10 ** invData.decimals
          };
        } else {
          newStake = { ...newStake, available: 0 };
        }
      } else {
        return;
      }
    } else {
      // unstaking
      if (["stacking", "staking", "fee-farming"].includes(invData.type)) {
        newUnstake = {
          token:
            invData.type === "stacking" || invData.type === "fee-farming"
              ? "WRAP"
              : "LPT",
          balance: invData.balance / 10 ** invData.decimals
        };
        tokensToUnstake = "";
      }
    }
  });
</script>

<Modal type="default" on:close={() => dispatch("close")}>
  <div slot="modal-title" class="modal-title">
    <div>
      {#if invData.type === "staking"}
        <div>
          {type === "stake" ? "Stake" : "Unstake"}
          {invData.icons.join("-")} LP tokens
        </div>
      {:else}
        <div>{type === "stake" ? "Stake" : "Unstake"} WRAP tokens</div>
      {/if}
    </div>
    <div>
      <div class="icons">
        {#each invData.icons as icon}
          <img src={`images/${icon}.png`} alt="token-icon" />
        {/each}
      </div>
    </div>
  </div>
  <div slot="modal-body" class="modal-body">
    {#if type === "stake"}
      {#if newStake.available || newStake.available === 0}
        <div class="modal-line">
          <div>
            Your balance: {formatTokenAmount(newStake.available)}
            {newStake.token}
          </div>
        </div>
        <div class="modal-line">
          <div class="input-with-button" class:error={insuffTokensToStake}>
            <input
              type="text"
              placeholder="Tokens to stake"
              bind:value={tokensToStake}
              on:input={ev => {
                const val = ev.target.value;
                // non numeric values
                if (isNaN(+val)) {
                  tokensToStake = "";
                  return;
                }
                // value exceeds the available tokens to stake
                if (+val > newStake.available) {
                  insuffTokensToStake = true;
                } else {
                  insuffTokensToStake = false;
                }
              }}
            />
            <button
              on:click={() => {
                tokensToStake = newStake.available.toString();
                insuffTokensToStake = false;
              }}
            >
              Max: {formatTokenAmount(newStake.available)}
            </button>
          </div>
        </div>
        <div class="modal-line">
          Current stake: {formatTokenAmount(
            invData.balance / 10 ** invData.decimals
          )}
          {invData.type === "stacking" || invData.type === "fee-farming"
            ? "WRAP"
            : "LPT"}
        </div>
        <div class="modal-line">
          New stake:
          {#if tokensToStake && +tokensToStake > 0 && !insuffTokensToStake}
            {formatTokenAmount(
              invData.balance / 10 ** invData.decimals + +tokensToStake
            )}
            {invData.type === "stacking" || invData.type === "fee-farming"
              ? "WRAP"
              : "LPT"}
          {:else}
            No change
          {/if}
        </div>
      {:else}
        <div>Loading...</div>
      {/if}
    {:else if type === "unstake"}
      <div class="modal-line">Choose the amount of tokens to unstake:</div>
      <div class="modal-line">
        <div class="input-with-button" class:error={insuffTokensToUnstake}>
          <input
            type="text"
            placeholder="Tokens to unstake"
            bind:value={tokensToUnstake}
            on:input={setUpUnstake}
          />
          <button
            on:click={async () => {
              tokensToUnstake = newUnstake.balance.toString();
              insuffTokensToUnstake = false;
              await setUpUnstake();
            }}
          >
            Max: {formatTokenAmount(newUnstake.balance)}
          </button>
        </div>
      </div>
      {#if invData.type === "stacking" && wrapUnstakingFees && wrapUnstakingFees.length > 0}
        <div class="modal-line small error">
          Unstaking fee: {formatTokenAmount(
            [
              0,
              0,
              ...wrapUnstakingFees.map(el =>
                Math.ceil(el.fee * 10 ** $store.tokens.WRAP.decimals)
              )
            ].reduce((a, b) => a + b) /
              10 ** $store.tokens.WRAP.decimals
          )} WRAP
        </div>
      {/if}
      <div class="modal-line">
        Current stake: {formatTokenAmount(newUnstake.balance)}
        {newUnstake.token}
      </div>
      <div class="modal-line">
        New stake:
        {#if tokensToUnstake && +tokensToUnstake > 0 && !insuffTokensToUnstake}
          {formatTokenAmount(newUnstake.balance - +tokensToUnstake)}
          {newUnstake.token}
        {:else}
          No change
        {/if}
      </div>
    {/if}
  </div>
  <div slot="modal-footer" class="modal-footer">
    <div />
    <div class="buttons">
      {#if type === "stake"}
        {#if loading}
          <button class="primary loading">
            <span class="material-icons"> sync </span>
            &nbsp Staking
          </button>
        {:else}
          <button
            class="primary"
            disabled={!tokensToStake || insuffTokensToStake}
            on:click={stake}
          >
            Stake
          </button>
        {/if}
      {:else if type === "unstake"}
        {#if loading}
          <button class="primary loading">
            <span class="material-icons"> sync </span>
            &nbsp Unstaking
          </button>
        {:else}
          <button
            class="primary"
            disabled={!tokensToUnstake || insuffTokensToUnstake}
            on:click={unstake}
          >
            Unstake
          </button>
        {/if}
      {/if}
      <button class="primary" on:click={() => dispatch("close")}>
        Close
      </button>
    </div>
  </div>
</Modal>
