<script lang="ts">
  import { onMount } from "svelte";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import "tippy.js/themes/light-border.css";
  import store from "../../../store";
  import { formatTokenAmount } from "../../../utils";

  const rewardManagerAddress = "KT1MCgouivQ2rzam5hA2gqF1eMtY5i6ndJvT";
  const xPlentyCurveAddress = "KT1PxkrCckgh5fA5v2cZEE2bX5q2RV1rv8dj";
  let expectedPlentyTokens: null | number = null;

  const xPlentyComputation = async () => {
    try {
      const plentyTokenContract = await $store.Tezos.wallet.at(
        $store.tokens.PLENTY.address
      );
      const xPlentyCurveContract = await $store.Tezos.wallet.at(
        xPlentyCurveAddress
      );
      const rewardManagerContract = await $store.Tezos.wallet.at(
        rewardManagerAddress
      );
      // Accessing Contract Storage
      const plentyStorage: any = await plentyTokenContract.storage();
      const rewardManagerStorage: any = await rewardManagerContract.storage();
      const xPlentyCurveStorage: any = await xPlentyCurveContract.storage();
      // get current block level
      const currentBlockLevel = await getCurrentBlockLevel();
      // Compute xPlentyCurve Contract's plenty balance
      let plentyBalance = await plentyStorage.balances.get(xPlentyCurveAddress);
      plentyBalance = plentyBalance.balance.toNumber();

      const balanceUpdate =
        Math.min(
          currentBlockLevel,
          rewardManagerStorage.periodFinish.toNumber()
        ) - rewardManagerStorage.lastUpdate.toNumber();

      if (balanceUpdate > 0) {
        plentyBalance +=
          balanceUpdate * rewardManagerStorage.rewardRate.toNumber();
      }

      const totalSupply = xPlentyCurveStorage.totalSupply.toNumber();
      return {
        plentyBalance,
        totalSupply
      };
    } catch (error) {
      console.log(error);
    }
  };
  const getExpectedxPlenty = async (plentyAmount: number) => {
    const results = await xPlentyComputation();
    return (
      ((plentyAmount * results.totalSupply) / results.plentyBalance) * 0.995
    );
  };
  const getExpectedPlenty = async (xPlentyAmount: number) => {
    const results = await xPlentyComputation();
    try {
      if (results.totalSupply < xPlentyAmount) {
        throw "Invalid Request";
      }
      return (
        ((xPlentyAmount * results.plentyBalance) / results.totalSupply) * 0.995
      );
    } catch (error) {
      console.log(error);
    }
  };
  const getCurrentBlockLevel = async () => {
    try {
      const response = await $store.Tezos.rpc.getBlockHeader();
      return response.level;
    } catch (error) {
      console.log(error);
    }
  };
  /*getExpectedxPlenty(
    plentyInvesment
  );
  getExpectedPlenty(
    plentyInvesment
  );*/

  onMount(async () => {
    const contract = await $store.Tezos.wallet.at(
      $store.investments["xPLENTY-Staking"].address
    );
    const storage: any = await contract.storage();
    const balance = await storage.balances.get($store.userAddress);
    if (balance) {
      store.updateInvestments({
        ...$store.investments,
        "xPLENTY-Staking": {
          ...$store.investments["xPLENTY-Staking"],
          balance: formatTokenAmount(
            balance.toNumber() / 10 ** $store.tokens.xPLENTY.decimals
          )
        }
      });

      expectedPlentyTokens = await getExpectedPlenty(
        balance.toNumber() / 10 ** $store.tokens.xPLENTY.decimals
      );
    } else {
      store.updateInvestments({
        ...$store.investments,
        "xPLENTY-Staking": {
          ...$store.investments["xPLENTY-Staking"],
          balance: 0
        }
      });
    }

    tippy(`#xplenty-stake-button`, {
      content: "Stake"
    });
    tippy(`#xplenty-unstake-button`, {
      content: "Unstake"
    });
  });
</script>

<div class="farm-row">
  <div class="icon">
    <img src="images/xPLENTY.png" alt="xPLENTY-token-icon" />
  </div>
  <div>{$store.investments["xPLENTY-Staking"].alias}</div>
  <div>{$store.investments["xPLENTY-Staking"].balance}</div>
  <div>
    {formatTokenAmount(
      $store.investments["xPLENTY-Staking"].balance *
        $store.tokens.xPLENTY.exchangeRate
    )}
  </div>
  <div>
    {#if expectedPlentyTokens}
      {formatTokenAmount(expectedPlentyTokens)}
    {:else}
      <span class="material-icons"> hourglass_empty </span>
    {/if}
  </div>
  <div class="buttons">
    <button class="mini" id="xplenty-stake-button">
      <span class="material-icons"> file_download </span>
    </button>
    <button class="mini" id="xplenty-unstake-button">
      <span class="material-icons"> file_upload </span>
    </button>
  </div>
</div>