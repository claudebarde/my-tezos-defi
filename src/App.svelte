<script lang="ts">
  import { onMount, afterUpdate } from "svelte";
  import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
  import { RpcClient, RpcClientCache } from "@taquito/rpc";
  import { Tzip16Module } from "@taquito/tzip16";
  import store from "./store";
  import localStorageStore from "./localStorage";
  import { AvailableToken, AvailableFiat } from "./types";
  import type { State, TokenContract, Operation } from "./types";
  import Router from "svelte-spa-router";
  import routes from "./routes";
  import Menu from "./components/Menu/Menu.svelte";
  import Footer from "./components/Footer/Footer.svelte";
  import Header from "./components/Header/Header.svelte";
  import LiveTrafficWorker from "worker-loader!./livetraffic.worker";
  import config from "./config";
  import { createNewOpEntry, formatTokenAmount } from "./utils";
  import Toast from "./components/Toast/Toast.svelte";
  import toastStore from "./components/Toast/toastStore";

  let Tezos: TezosToolkit;
  let coinGeckoInterval;
  let liveTrafficWorker;
  let lastVisit = 0;
  let appReady = false;

  const fetchTezToolsPrices = async (
    tokens: [AvailableToken, TokenContract][]
  ) => {
    try {
      const tezToolsDataRes = await fetch(`https://api.teztools.io/v1/prices`);
      if (tezToolsDataRes && tezToolsDataRes.status === 200) {
        const tezToolsData = await tezToolsDataRes.json();
        // selects whitelisted tokens
        const availableTokens = Object.values(AvailableToken).map(tk =>
          tk.toLowerCase()
        );
        const tezToolsTokens = tezToolsData.contracts.filter(contract =>
          availableTokens.includes(
            contract.symbol && contract.symbol.toLowerCase()
          )
        );
        tokens = tokens.map(([tokenSymbol, tokenData]) => {
          let tezToolToken = tezToolsTokens.find(
            tk => tk.symbol.toLowerCase() === tokenSymbol.toLowerCase()
          );
          if (tezToolToken) {
            return [
              tokenSymbol,
              {
                ...tokenData,
                exchangeRate: tezToolToken.currentPrice,
                websiteLink: tezToolToken.websiteLink
              }
            ];
          } else {
            return [tokenSymbol, tokenData];
          }
        });
        store.updateTokens(tokens);
        return true;
      } else {
        throw "Unable to fetch TezTools prices";
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const handleLiveTrafficWorker = async (msg: MessageEvent) => {
    if (msg.data.type === "live-traffic" && msg.data.msg) {
      const ops: Operation[] = [];
      let transfersTotal: { token: AvailableToken; amount: number }[] = [];
      msg.data.msg.forEach(op => {
        if (!$store.tokens) return;
        //console.log("Operation:", op);
        const newOp: Operation = createNewOpEntry(op, $store.tokens);
        ops.push(newOp);

        if (
          op.status === "applied" &&
          Object.values($store.tokens)
            .map(tk => tk.address)
            .includes(op.target.address) &&
          op?.parameter?.entrypoint === "transfer"
        ) {
          // a transaction was sent to a token contract
          //console.log("Transfer operation:", op);
          let updatedTokensBalances = { ...$store.tokensBalances };
          let token: [string, TokenContract];

          const paramValue = op.parameter.value;
          if (Array.isArray(paramValue)) {
            // FA2
            paramValue.forEach(op => {
              if (op.from_ === $store.userAddress) {
                console.log("FA2 operation from user account:", op);
                // token transfer from the user
                op.txs.forEach(tx => {
                  token = Object.entries($store.tokens).find(
                    tk =>
                      tk[1].address === op.target.address &&
                      tk[1].tokenId === tx.token_id
                  );
                  let userBalance = updatedTokensBalances[token[0]];
                  userBalance -= +tx.amount / 10 ** token[1].decimals;
                  // updates balance
                  updatedTokensBalances[token[0]] =
                    userBalance < 0 ? 0 : userBalance;
                  // updates balances
                  store.updateTokensBalances(updatedTokensBalances);
                });
              } else {
                // token transfer to the user
                let totalTokens = 0;
                op.txs.forEach(tx => {
                  if (tx.to_ === $store.userAddress) {
                    console.log("FA2 operation to user account:", op);
                    token = Object.entries($store.tokens).find(
                      tk =>
                        tk[1].address === op.target.address &&
                        tk[1].tokenId === tx.token_id
                    );
                    let userBalance = updatedTokensBalances[token[0]];
                    totalTokens += +tx.amount;
                    userBalance += +tx.amount / 10 ** token[1].decimals;
                    // updates balance
                    updatedTokensBalances[token[0]] =
                      userBalance < 0 ? 0 : userBalance;
                    // updates balances
                    store.updateTokensBalances(updatedTokensBalances);
                  }
                });
                // only displays transactions involving the user
                if (totalTokens > 0) {
                  toastStore.addToast({
                    type: "info",
                    title: `Incoming tokens`,
                    text: `${formatTokenAmount(
                      totalTokens / 10 ** token[1].decimals
                    )} ${token[0]}`,
                    dismissable: true
                  });
                }
              }
            });
          } else if (
            paramValue.hasOwnProperty("to") &&
            paramValue.hasOwnProperty("from") &&
            paramValue.hasOwnProperty("value")
          ) {
            // FA1.2
            // finds token
            token = Object.entries($store.tokens).find(
              tk => tk[1].address === op.target.address
            );
            if (!token) return;
            let userBalance = updatedTokensBalances[token[0]];
            if (paramValue.from === $store.userAddress) {
              console.log("FA1.2 operation from user account:", op);
              // token transfer from the user
              userBalance -= +paramValue.value / 10 ** token[1].decimals;
              // creates toast
              toastStore.addToast({
                type: "info",
                title: `Outgoing tokens`,
                text: `${+paramValue.value / 10 ** token[1].decimals} ${
                  token[0]
                }`,
                dismissable: true,
                token: token[0] as AvailableToken
              });
            } else if (paramValue.to === $store.userAddress) {
              const totalTokens = +paramValue.value / 10 ** token[1].decimals;
              console.log("FA1.2 operation to user account:", op);
              // saves transfer info in transfers array
              // to prevent displaying multiple toasts for the same token
              // in case of multiple transfers
              const previousTransfers = transfersTotal.find(
                trsf => trsf.token === token[0]
              );
              if (previousTransfers) {
                const newTransfer = {
                  ...previousTransfers,
                  amount: previousTransfers.amount + totalTokens
                };
                transfersTotal = [
                  ...transfersTotal.filter(trsf => trsf.token === token[0]),
                  newTransfer
                ];
              } else {
                transfersTotal = [
                  ...transfersTotal,
                  { token: token[0] as AvailableToken, amount: totalTokens }
                ];
              }
              // token transfer to the user
              userBalance += totalTokens;
            }
            // updates balance
            updatedTokensBalances[token[0]] = userBalance < 0 ? 0 : userBalance;
            // updates balances
            store.updateTokensBalances(updatedTokensBalances);
          }
          // shows transfers toast
          if (transfersTotal.length > 0) {
            transfersTotal.forEach(transfer => {
              toastStore.addToast({
                type: "info",
                title: `Incoming tokens`,
                text: `${transfer.amount} ${transfer.token}`,
                dismissable: true,
                token: transfer.token
              });
            });
          }
        } else if (
          op.status === "applied" &&
          Object.values($store.investments)
            .map(inv => inv.address)
            .includes(op.target.address)
        ) {
          // one of the followed investments contracts
          const investment = Object.entries($store.investments).find(
            inv => inv[1].address === op.target.address
          );
          // PLENTY contracts
          if (investment[1].platform === "plenty") {
            if (
              op?.parameter?.entrypoint === "stake" &&
              op.sender.address === $store.userAddress
            ) {
              const value = +op.parameter.value;
              const newInvestments = {
                ...$store.investments,
                [investment[0]]: {
                  ...investment[1],
                  balance: +investment[1].balance + value
                }
              };
              store.updateInvestments(newInvestments);
              /*toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });*/
            } else if (
              op?.parameter?.entrypoint === "unstake" &&
              op.sender.address === $store.userAddress
            ) {
              console.log("Plenty unstake");
            }
          }
          // PAUL contracts
          if (investment[1].platform === "paul") {
            if (
              op?.parameter?.entrypoint === "join" &&
              op.sender.address === $store.userAddress
            ) {
              const value = +op.parameter.value.nat;
              const newInvestments = {
                ...$store.investments,
                [investment[0]]: {
                  ...investment[1],
                  balance: +investment[1].balance + value
                }
              };
              store.updateInvestments(newInvestments);
              /*toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });*/
            } else if (
              op?.parameter?.entrypoint === "quit" &&
              op.sender.address === $store.userAddress
            ) {
              console.log("Paul unstake");
            }
          }
          // kDAO contracts
          if (investment[1].platform === "kdao") {
            if (
              op?.parameter?.entrypoint === "deposit" &&
              op.sender.address === $store.userAddress
            ) {
              const value = +op.parameter.value;
              const newInvestments = {
                ...$store.investments,
                [investment[0]]: {
                  ...investment[1],
                  balance: +investment[1].balance + value
                }
              };
              store.updateInvestments(newInvestments);
              /*toastStore.addToast({
                type: "info",
                text: `Staked ${
                  +(value / investment[1].decimals).toFixed(2) / 1
                } tokens on ${investment[1].alias}`,
                dismissable: false
              });*/
            } else if (
              op?.parameter?.entrypoint === "withdraw" &&
              op.sender.address === $store.userAddress
            ) {
              console.log("kDAO unstake");
            }
          }
        }
      });
      store.updateLastOperations(ops);
      store.updateCurrentLevel(ops[0].level);

      if ($store.userAddress) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
    } else if (msg.data.type === "init-last-ops") {
      // loads transactions from the last 5 blocks
      const ops: Operation[] = [];
      msg.data.msg.forEach(op => {
        const newOp: Operation = createNewOpEntry(op, $store.tokens);

        ops.push(newOp);
      });
      store.updateLastOperations(ops);
      store.updateCurrentLevel(ops[0].level);

      if ($store.userAddress) {
        const balance = await $store.Tezos.tz.getBalance($store.userAddress);
        if (balance) {
          store.updateTezBalance(balance.toNumber());
        }
      }
    }
  };

  onMount(async () => {
    let rpcUrl = $store.settings[$store.network].rpcUrl;
    if (window.localStorage) {
      const settingsStorage = window.localStorage.getItem("mtd");
      if (settingsStorage) {
        const settings = JSON.parse(settingsStorage);
        rpcUrl = settings.favoriteRpcUrl;
      }
    }

    const rpcClient = new RpcClient(rpcUrl);
    Tezos = new TezosToolkit(new RpcClientCache(rpcClient));
    Tezos.setPackerProvider(new MichelCodecPacker());
    Tezos.addExtension(new Tzip16Module());
    store.updateTezos(Tezos);

    let tokens: [AvailableToken, TokenContract][] = [];
    try {
      // fetches data from the IPFS
      const defiDataResponse = await fetch(
        `https://cloudflare-ipfs.com/ipfs/${$store.defiData}`
        //`https://gateway.pinata.cloud/ipfs/${$store.defiData}`
      );
      if (defiDataResponse) {
        const defiData: {
          tokens: Omit<
            State["tokens"],
            "exchangeRate" | "thumbnail" | "websiteLink"
          >;
          investments: any;
        } = await defiDataResponse.json();
        if (defiData.tokens) {
          // stores tokens info
          Object.entries(defiData.tokens).forEach(([tokenSymbol, token]) => {
            if (tokenSymbol !== "sDAO") {
              tokens.push([
                tokenSymbol as AvailableToken,
                {
                  ...token,
                  exchangeRate: null,
                  thumbnail: undefined,
                  websiteLink: undefined
                }
              ]);
            }
          });
        }

        if (defiData.investments) {
          /*defiData.investments["Ctez-kUSD-LP"] = {
            id: "Ctez-kUSD-LP",
            platform: "plenty",
            address: "KT1L8N5RZg4CM2VSnuC8t1CGLiQpzVoN6P1u",
            decimals: 12,
            info: [],
            alias: "Ctez-kUSD LP farm",
            icons: ["Ctez", "kUSD"],
            rewardToken: "PLENTY",
            liquidityToken: true
          };
          defiData.investments["Ctez-PAUL-LP"] = {
            id: "Ctez-PAUL-LP",
            platform: "plenty",
            address: "KT1K3NERNpLxRmREpmjqt7LsvEr2SbC9Cs6o",
            decimals: 7,
            info: [],
            alias: "Ctez-PAUL LP farm",
            icons: ["Ctez", "PAUL"],
            rewardToken: "PLENTY",
            liquidityToken: true
          };
          defiData.investments["Ctez-wWBTC-LP"] = {
            id: "Ctez-wWBTC-LP",
            platform: "plenty",
            address: "KT1VmvPo8bLYh1xVC9TpzwWtrczjzEMS2mEk",
            decimals: 7,
            info: [],
            alias: "Ctez-wWBTC LP farm",
            icons: ["Ctez", "wWBTC"],
            rewardToken: "PLENTY",
            liquidityToken: true
          };*/

          Object.keys(defiData.investments).forEach(key => {
            defiData.investments[key].balance = 0;
            defiData.investments[key].favorite =
              $localStorageStore &&
              $localStorageStore.favoriteInvestments &&
              $localStorageStore.favoriteInvestments.includes(key);
          });
          store.updateInvestments({
            ...defiData.investments
          });
        }

        if (defiData["wrap-staking"]) {
          // builds investment data for WRAP staking farms
          const investmentsWithWrapStaking = { ...$store.investments };
          defiData["wrap-staking"].forEach(
            farm =>
              (investmentsWithWrapStaking[`${farm.token}-XTZ-LM`] = {
                id: `${farm.token}-XTZ-LM`,
                platform: "wrap",
                type: "staking",
                address: farm.contract,
                decimals: 6,
                info: [],
                alias: `${farm.token}-XTZ LM pool`,
                icons: [farm.token, "XTZ"],
                rewardToken: farm.token,
                liquidityToken: true
              })
          );
          store.updateInvestments({
            ...investmentsWithWrapStaking
          });
        }

        if (defiData["wrap-fee-farming"]) {
          // builds investment data for WRAP fee farming
          const investmentsWithWrapFeeFarming = { ...$store.investments };
          defiData["wrap-fee-farming"].forEach(
            farm =>
              (investmentsWithWrapFeeFarming[
                `WRAP-${farm.token.toUpperCase()}-FM`
              ] = {
                id: `WRAP-${farm.token.toUpperCase()}-FM`,
                platform: "wrap",
                type: "fee-farming",
                address: farm.contract,
                decimals: 8,
                info: [],
                alias: `${farm.token} Fee Farming`,
                icons: ["WRAP", farm.token],
                rewardToken: farm.token,
                liquidityToken: false
              })
          );
          store.updateInvestments({
            ...investmentsWithWrapFeeFarming
          });
        }

        if (defiData["plenty-ctez-farms"]) {
          // builds investment data for Ctez farms on Plenty
          const investmentsWithCtezFarms = { ...$store.investments };
          defiData["plenty-ctez-farms"].forEach(
            farm =>
              (investmentsWithCtezFarms[`Ctez-${farm.token}-LP`] = {
                id: `Ctez-${farm.token}-LP`,
                platform: "plenty",
                address: farm.address,
                decimals: farm.decimals,
                info: [],
                alias: `Ctez-${farm.token} LP farm`,
                icons: ["Ctez", farm.token],
                rewardToken: "PLENTY",
                liquidityToken: true
              })
          );
          store.updateInvestments({
            ...investmentsWithCtezFarms
          });
        }
      } else {
        toastStore.addToast({
          type: "error",
          title: "IPFS Error",
          text: "Unable to load tokens and investments data from the IPFS",
          dismissable: true
        });
        console.error(
          "Unable to load tokens and investments data from the IPFS"
        );
      }
      // fetches data from TezTools
      const tokensSuccess = await fetchTezToolsPrices(tokens);
      if (tokensSuccess) {
        // fetches fiat exchange rate
        const coinGeckoFetch = async () => {
          const preferredFiat = $localStorageStore.preferredFiat
            ? $localStorageStore.preferredFiat.toLowerCase()
            : AvailableFiat.USD;
          const url = `https://api.coingecko.com/api/v3/coins/tezos/market_chart?vs_currency=${preferredFiat}&days=30&interval=daily`;
          const coinGeckoResponse = await fetch(url);
          if (coinGeckoResponse) {
            const data = await coinGeckoResponse.json();
            console.log(data);
            const prices = data.prices;
            const xtzFiatExchangeRate = prices[prices.length - 1][1];
            store.updateXtzFiatExchangeRate(xtzFiatExchangeRate);
            store.updateXtzDataHistoric(
              prices.map(price => ({
                timestamp: new Date(price[0]).toISOString(),
                price: price[1]
              }))
            );
            if ($localStorageStore) {
              // saves the exchange rate in the local store
              localStorageStore.updateFiat(
                $localStorageStore.preferredFiat,
                xtzFiatExchangeRate
              );
            }
          } else {
            throw "No response from CoinGecko API";
          }
        };

        await coinGeckoFetch();
        coinGeckoInterval = setInterval(coinGeckoFetch, 120_000);

        // updates service fee for test version
        if (
          window.location.href.includes("localhost") ||
          window.location.href.includes("staging")
        ) {
          store.updateServiceFee(null);
        }

        // refreshes data
        if (lastVisit === 0) lastVisit = Date.now();
        document.addEventListener("visibilitychange", async () => {
          if (
            document.visibilityState === "visible" &&
            Date.now() > lastVisit + 60_000 * 10
          ) {
            lastVisit = Date.now();
            await fetchTezToolsPrices(
              Object.entries($store.tokens) as [AvailableToken, TokenContract][]
            );
            console.log("refreshes data");
          }
        });

        appReady = true;
      }
    } catch (error) {
      console.error(error);
    }
  });

  afterUpdate(async () => {
    if (
      !liveTrafficWorker &&
      $store.tokens &&
      $store.investments &&
      $localStorageStore
    ) {
      // inits live traffic worker
      liveTrafficWorker = new LiveTrafficWorker();
      liveTrafficWorker.postMessage({
        type: "init",
        payload: [
          ...Object.values($store.tokens).map(tk => tk.address),
          ...Object.values($store.investments)
            .filter(inv =>
              $localStorageStore.favoriteInvestments.includes(inv.id)
            )
            .map(inv => inv.address),
          ...config.lbContracts
        ]
      });
      liveTrafficWorker.onmessage = handleLiveTrafficWorker;
    }
  });
</script>

<style lang="scss">
  .general-container {
    display: grid;
    grid-template-rows: 10% 85% 5%;
    overflow: hidden;
  }
</style>

<main>
  <Menu />
  <div class="general-container">
    <Header />
    {#if appReady}
      <Router {routes} />
    {:else}
      Loading...
    {/if}
    <Footer />
  </div>
</main>
<Toast />
