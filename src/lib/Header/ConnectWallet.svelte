<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { BeaconWallet } from "@taquito/beacon-wallet";
  import {
    NetworkType,
    BeaconEvent,
    defaultEventCallbacks
  } from "@airgap/beacon-sdk";
  import { bytes2Char } from "@taquito/utils";
  import type { TezosAccountAddress, State } from "../../types";
  import store from "../../store";
  import localStorageStore from "../../localStorage";
  import toastStore from "../Toast/toastStore";
  //import InvestmentsWorker from "worker-loader!../../investments.worker";
  //import { handleInvestmentsWorker } from "../../workersHandlers";
  import { searchUserTokens } from "../../utils";

  const walletOptions = {
    name: "My Tezos DeFi",
    preferredNetwork:
      $store.network === "mainnet"
        ? NetworkType.MAINNET
        : NetworkType.FLORENCENET,
    disableDefaultEvents: true, // Disable all events / UI. This also disables the pairing alert.
    eventHandlers: {
      // To keep the pairing alert, we have to add the following default event handlers back
      [BeaconEvent.PAIR_INIT]: {
        handler: defaultEventCallbacks.PAIR_INIT
      },
      [BeaconEvent.PAIR_SUCCESS]: {
        handler: defaultEventCallbacks.PAIR_SUCCESS
      }
    }
  };
  const tezosDomainContract = "KT1GBZmSxmnKJXGMdMLbugPfLyUPmuLSMwKS";
  let username = "";
  let investmentsWorker;
  let nodeIconLetter = "";

  const connect = async () => {
    try {
      const wallet = new BeaconWallet(walletOptions);
      await wallet.requestPermissions({
        network: {
          type: walletOptions.preferredNetwork,
          rpcUrl: $store.settings[$store.network].rpcUrl
        }
      });
      const userAddress = await wallet.getPKH();
      store.updateUserAddress(userAddress as any);
      store.updateWallet(wallet);
      $store.Tezos.setWalletProvider(wallet);
      // inits local storage
      localStorageStore.init($store.userAddress);

      // listens to investments worker
      /*investmentsWorker = new InvestmentsWorker();
      investmentsWorker.onmessage = handleInvestmentsWorker;
      investmentsWorker.postMessage({
        type: "init",
        payload: {
          rpcUrl: $store.settings[$store.network].rpcUrl,
          userAddress: $store.userAddress
        }
      });*/

      username = await fetchTezosDomain(userAddress);

      let favoriteBalances: Partial<State["tokensBalances"]> = {};
      $localStorageStore.favoriteTokens.forEach(
        tk => (favoriteBalances[tk] = 0)
      );
      const newBalances = await searchUserTokens({
        Tezos: $store.Tezos,
        network: $store.network,
        userAddress: $store.userAddress,
        tokens: Object.entries($store.tokens).filter(tk =>
          $localStorageStore.favoriteTokens.includes(tk[0])
        ),
        tokensBalances: favoriteBalances
      });
      store.updateTokensBalances(newBalances as State["tokensBalances"]);

      // replaces default node url with user's favorite
      if ($localStorageStore.favoriteRpcUrl) {
        $store.Tezos.setRpcProvider($localStorageStore.favoriteRpcUrl);
      }
    } catch (err) {
      console.error(err);
      toastStore.addToast({
        type: "error",
        text: "Couldn't load your tokens",
        dismissable: false
      });
    }
  };

  const disconnect = () => {
    $store.wallet.client.destroy();
    store.updateWallet(undefined);
    store.updateUserAddress(undefined);
    $store.Tezos.setWalletProvider(undefined);
    // reset balances to zero
    const zeroBalances = { ...$store.tokensBalances };
    Object.keys($store.tokensBalances).forEach(
      token => (zeroBalances[token] = undefined)
    );
    store.updateTokensBalances(zeroBalances);
    localStorageStore.destroy();
  };

  const fetchTezosDomain = async (address: string): Promise<string> => {
    try {
      const contract = await $store.Tezos.wallet.at(tezosDomainContract);
      const storage: any = await contract.storage();
      const user = await storage.store.reverse_records.get(address);
      if (user) {
        return bytes2Char(user.name);
      } else {
        return address.slice(0, 5) + "..." + address.slice(-5);
      }
    } catch (error) {
      console.error(
        "Failed to fetch Tezos domain contract or username with error:",
        error
      );
      toastStore.addToast({
        type: "error",
        text: "Failed to fetch Tezos domain contract or username",
        dismissable: false
      });
      return address.slice(0, 5) + "..." + address.slice(-5);
    }
  };

  onMount(async () => {
    // initializes the wallet
    const wallet = new BeaconWallet(walletOptions as any);
    const activeAccount = await wallet.client.getActiveAccount();
    if (activeAccount) {
      const userAddress = await wallet.getPKH();
      store.updateUserAddress(userAddress as TezosAccountAddress);
      store.updateWallet(wallet);
      $store.Tezos.setWalletProvider(wallet);
      localStorageStore.init(userAddress);

      // listens to investments worker
      /*investmentsWorker = new InvestmentsWorker();
      investmentsWorker.onmessage = handleInvestmentsWorker;
      investmentsWorker.postMessage({
        type: "init",
        payload: {
          rpcUrl: $store.settings[$store.network].rpcUrl,
          userAddress: $store.userAddress
        }
      });*/

      username = await fetchTezosDomain(userAddress);

      let favoriteBalances: Partial<State["tokensBalances"]> = {};
      $localStorageStore.favoriteTokens.forEach(
        tk => (favoriteBalances[tk] = 0)
      );
      try {
        const newBalances = await searchUserTokens({
          Tezos: $store.Tezos,
          network: $store.network,
          userAddress: $store.userAddress,
          tokens: Object.entries($store.tokens).filter(tk =>
            $localStorageStore.favoriteTokens.includes(tk[0])
          ),
          tokensBalances: favoriteBalances
        });
        store.updateTokensBalances(newBalances as State["tokensBalances"]);

        // replaces default node url with user's favorite
        if ($localStorageStore.favoriteRpcUrl) {
          //$store.Tezos.setRpcProvider($localStorageStore.favoriteRpcUrl);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      localStorageStore.init();
    }
  });

  afterUpdate(() => {
    if ($store.Tezos) {
      const nodeUrl = $store.Tezos.rpc.getRpcUrl();
      switch (nodeUrl) {
        case "https://mainnet-tezos.giganode.io":
          nodeIconLetter = "G";
          break;
        case "https://api.tez.ie/rpc/mainnet":
          nodeIconLetter = "E";
          break;
        case "https://mainnet.smartpy.io/":
          nodeIconLetter = "S";
          break;
        case "https://rpc.tzbeta.net/":
          nodeIconLetter = "B";
          break;
        case "https://teznode.letzbake.com/":
          nodeIconLetter = "L";
          break;
        default:
          nodeIconLetter = "";
      }
    }
  });
</script>

<style lang="scss">
  button {
    appearance: none;
    border: solid 4px transparent;
    padding: 10px 20px;
    margin-left: 20px;
    font-size: 1.1rem;
    color: #f9fafb;
    font-family: "Signika", sans-serif;
    background-color: #4c1d95;
    border-radius: 10px;
    transition: 0.3s;
    cursor: pointer;

    &:hover {
      border: solid 4px #5b21b6;
    }
  }

  a {
    text-decoration: none;
    color: inherit;

    &:hover {
      text-decoration: underline;
    }
  }

  .connected-node {
    position: relative;
    padding: 0px;
    padding-right: 10px;
  }
</style>

{#if $store.userAddress}
  <div title={`Connected to ${$store.Tezos.rpc.getRpcUrl()}`}>
    <sup>{nodeIconLetter}</sup><span class="material-icons connected-node">
      dns
    </span>
  </div>
  <div>
    <a href="#/profile">
      {username}
    </a>
  </div>
  <button on:click={disconnect}>Disconnect</button>
{:else}
  <button on:click={connect}>Connect</button>
{/if}
