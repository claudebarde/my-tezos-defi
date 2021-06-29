<script lang="ts">
  import { afterUpdate } from "svelte";
  import store from "../../store";
  import { calcTotalShareValueInTez, getKolibriOvens } from "../../utils";
  import type { KolibriOvenData, AvailableToken } from "../../types";
  import Modal from "../Modal/Modal.svelte";
  import PoolManagement from "../Modal/PoolManagement.svelte";
  import config from "../../config";

  let kolibriOvens: KolibriOvenData[] = [];
  let kolibriOvensChecked = false;
  let manageModalInput: {
    open: boolean;
    loading: boolean;
    title: string;
    token?: AvailableToken;
    balance: number;
    body: string[];
    stakes?: {
      id: number;
      amount: number;
      level: number;
      withdrawalFee: number;
    }[];
    unstake?: number[];
  } = {
    open: false,
    loading: false,
    title: "",
    balance: 0,
    body: []
  };

  const shortenHash = (hash: string): string =>
    hash ? hash.slice(0, 7) + "..." + hash.slice(-7) : "";

  const openmanageModalInput = async (
    contractAddress: string,
    alias: string
  ) => {
    manageModalInput = {
      open: true,
      loading: true,
      title: alias,
      balance: 0,
      body: []
    };
    // PLENTY FARMS/POOLS
    if (alias.split(" ")[0].toLowerCase() === "plenty") {
      const inv = Object.values($store.investments).find(
        details => details.address[$store.network] === contractAddress
      );
      const token = $store.tokens[inv.token];

      const contract = await $store.Tezos.wallet.at(contractAddress);
      const storage: any = await contract.storage();
      // looks for user's info
      const userInfo = await storage.balances.get($store.userAddress);
      if (userInfo) {
        // displays balances
        manageModalInput.balance =
          userInfo.balance.toNumber() / 10 ** inv.decimals;

        // displays different stakes
        if (userInfo.InvestMap.size > 0) {
          manageModalInput.stakes = [];
          manageModalInput.unstake = [];
          manageModalInput.token = inv.token;

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
            manageModalInput.stakes = [
              ...manageModalInput.stakes,
              {
                id: stake[0],
                amount: amount / 10 ** token.decimals,
                level: stakeLevel,
                withdrawalFee: withdrawalFee / 10 ** token.decimals
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
          manageModalInput.body = [
            ...manageModalInput.body,
            `APR: ${apr.toFixed(2)} %`
          ];
          const apy = ((1 + apr / 100 / 365) ** 365 - 1) * 100;
          manageModalInput.body = [
            ...manageModalInput.body,
            `APY: ${apy.toFixed(2)} %`
          ];
          manageModalInput.loading = false;
        }
      } else {
        manageModalInput.body = ["Unable to find balances in contract"];
        manageModalInput.loading = false;
      }
    } else {
      manageModalInput.body = ["Unable to use this contract"];
      manageModalInput.loading = false;
    }
  };

  afterUpdate(async () => {
    // finds if user has Kolibri ovens
    if ($store.userAddress && !kolibriOvensChecked) {
      const ovens = await getKolibriOvens($store.userAddress, $store.Tezos);
      if (ovens) {
        kolibriOvens = [...ovens];
        kolibriOvensChecked = true;
      }
    }
  });
</script>

<style lang="scss">
  @import "../../styles/settings.scss";

  .container-investments {
    .row {
      display: grid;
      grid-template-columns: 10% 25% 20% 17% 17% 11%;
      padding: 5px 10px;
      align-items: center;

      &.break-line {
        border-bottom: solid 2px $border-color;
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
  }
</style>

<div class="container">
  <div class="title">Investments</div>
  <div class="container-investments">
    {#if Object.values($store.investments).every(inv => inv.balance === undefined)}
      <div class="row">
        <div style="grid-column:1 / span 2">Waiting for update...</div>
      </div>
    {:else if Object.values($store.investments).every(inv => inv.balance === 0) && $store.investments["CRUNCHY-FARMS"].info.length === 0}
      <div class="row">
        <div style="grid-column:1 / span 2">No investment found</div>
      </div>
    {:else}
      {#if kolibriOvens.length > 0 && kolibriOvens.filter(oven => !oven.isLiquidated).length > 0}
        <div class="row">
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
              <div>{+oven.locked / 10 ** 6} ꜩ</div>
              <div>{+oven.borrowed / 10 ** 18} kUSD</div>
            </div>
          {/if}
        {/each}
        <div class="row break-line" />
      {/if}
      <div class="row">
        <div />
        <div>Contract</div>
        <div>Balance</div>
        <div>Value in XTZ</div>
        <div>Value in {$store.xtzData.toFiat}</div>
      </div>
      {#each Object.entries($store.investments) as [contractName, data]}
        {#if data.balance > 0}
          <div class="row">
            <div class="icon">
              {#each data.icons as icon}
                <img src={`images/${icon}.png`} alt="token-icon" />
              {/each}
            </div>
            <div>
              <a
                href={`https://better-call.dev/mainnet/${
                  data.address[$store.network]
                }/operations`}
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                {data.alias}
              </a>
            </div>
            <div>{data.balance / 10 ** data.decimals}</div>
            {#if ["Plenty hDAO staking", "Plenty staking", "Plenty USDtz staking"].includes(data.alias) && $store.tokensExchangeRates[data.token]}
              <div>
                <span>
                  {+(
                    (data.balance / 10 ** data.decimals) *
                    $store.tokensExchangeRates[data.token].tokenToTez
                  ).toFixed(5) / 1}
                </span>
              </div>
              <div>
                <span>
                  {+(
                    (data.balance / 10 ** data.decimals) *
                    $store.tokensExchangeRates[data.token].tokenToTez *
                    $store.xtzData.exchangeRate
                  ).toFixed(5) / 1}
                </span>
              </div>
              <div>
                <!--<button
                  class="button investments"
                  on:click={() =>
                    openmanageModalInput(
                      data.address[$store.network],
                      data.alias
                    )}
                >
                  Manage
                </button>-->
              </div>
            {:else if data.alias === "PLENTY-XTZ LP farm" && $store.tokensExchangeRates.PLENTY}
              <div>
                <span>
                  {+calcTotalShareValueInTez(
                    data.balance,
                    data.shareValueInTez,
                    $store.tokensExchangeRates.PLENTY.tokenToTez,
                    $store.tokens.PLENTY.decimals
                  ).toFixed(5) / 1}
                </span>
              </div>
              <div>
                <span>
                  {+(
                    calcTotalShareValueInTez(
                      data.balance,
                      data.shareValueInTez,
                      $store.tokensExchangeRates.PLENTY.tokenToTez,
                      $store.tokens.PLENTY.decimals
                    ) * $store.xtzData.exchangeRate
                  ).toFixed(5) / 1}
                </span>
              </div>
            {:else}
              <div>--</div>
              <div>--</div>
            {/if}
          </div>
        {:else if contractName === "CRUNCHY-FARMS"}
          <!-- CRUNCHY FARMS have a zero balance but data in the info array -->
          {#each data.info as farm}
            {#if farm.farmId < 3}
              <div class="row">
                <div class="icon">
                  {#if farm.farmId == 0}
                    <img src="images/XTZ.png" alt="token-icon" />
                    <img src="images/CRUNCH.png" alt="token-icon" />
                  {:else if farm.farmId == 1}
                    <img src="images/XTZ.png" alt="token-icon" />
                    <img src="images/kUSD.png" alt="token-icon" />
                  {:else if farm.farmId == 2}
                    <img src="images/XTZ.png" alt="token-icon" />
                    <img src="images/wWBTC.png" alt="token-icon" />
                  {:else}
                    <img src="images/crDAO.png" alt="token-icon" />
                  {/if}
                </div>
                <div>
                  <a
                    href={`https://better-call.dev/mainnet/${
                      data.address[$store.network]
                    }/operations`}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    {#if farm.farmId == 0}
                      Crunchy Farm XTZ/CRUNCH
                    {:else if farm.farmId == 1}
                      Crunchy Farm XTZ/kUSD
                    {:else if farm.farmId == 2}
                      Crunchy Farm XTZ/wWBTC
                    {:else}
                      {data.alias}
                    {/if}
                  </a>
                </div>
                <div>{farm.amount / 10 ** data.decimals}</div>
                <div>
                  {#if farm.farmId == 0 && $store.tokensExchangeRates.CRUNCH}
                    {+calcTotalShareValueInTez(
                      farm.amount,
                      farm.shareValueInTez,
                      $store.tokensExchangeRates.CRUNCH.tokenToTez,
                      $store.tokens.CRUNCH.decimals
                    ).toFixed(5) / 1}
                  {:else if farm.farmId == 1 && $store.tokensExchangeRates.kUSD}
                    {+calcTotalShareValueInTez(
                      farm.amount,
                      farm.shareValueInTez,
                      $store.tokensExchangeRates.KUSD.tokenToTez,
                      $store.tokens.KUSD.decimals
                    ).toFixed(5) / 1}
                  {:else if farm.farmId == 2 && $store.tokensExchangeRates.wWBTC}
                    {+calcTotalShareValueInTez(
                      farm.amount,
                      farm.shareValueInTez,
                      $store.tokensExchangeRates.wWBTC.tokenToTez,
                      $store.tokens.wWBTC.decimals
                    ).toFixed(5) / 1}
                  {:else}
                    --
                  {/if}
                </div>
                <div>
                  {#if farm.farmId == 0 && $store.tokensExchangeRates.CRUNCH}
                    {+(
                      calcTotalShareValueInTez(
                        farm.amount,
                        farm.shareValueInTez,
                        $store.tokensExchangeRates.CRUNCH.tokenToTez,
                        $store.tokens.CRUNCH.decimals
                      ) * $store.xtzData.exchangeRate
                    ).toFixed(5) / 1}
                  {:else if farm.farmId == 1 && $store.tokensExchangeRates.kUSD}
                    {+(
                      calcTotalShareValueInTez(
                        farm.amount,
                        farm.shareValueInTez,
                        $store.tokensExchangeRates.KUSD.tokenToTez,
                        $store.tokens.KUSD.decimals
                      ) * $store.xtzData.exchangeRate
                    ).toFixed(5) / 1}
                  {:else if farm.farmId == 2 && $store.tokensExchangeRates.wWBTC}
                    {+(
                      calcTotalShareValueInTez(
                        farm.amount,
                        farm.shareValueInTez,
                        $store.tokensExchangeRates.wWBTC.tokenToTez,
                        $store.tokens.wWBTC.decimals
                      ) * $store.xtzData.exchangeRate
                    ).toFixed(5) / 1}
                  {:else}
                    --
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        {/if}
      {/each}
    {/if}
  </div>
</div>
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
