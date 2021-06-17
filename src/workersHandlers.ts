import { get } from "svelte/store";
import store from "./store";

const localStore = get(store);

export const handleInvestmentsWorker = (msg: MessageEvent) => {
  if (msg.data.type === "investments") {
    console.log("Investments:", msg.data);

    const newInvestments = { ...localStore.investments };
    // resets balances to zero
    Object.keys(newInvestments).forEach(
      inv => (newInvestments[inv].balance = 0)
    );
    // updates investments
    msg.data.msg.forEach(inv => {
      if (inv) {
        newInvestments[inv.name] = {
          ...newInvestments[inv.name],
          balance: inv.balance,
          info: inv.info,
          shareValueInTez: inv.shareValueInTez ? inv.shareValueInTez : undefined
        };
      }
    });

    store.updateInvestments(newInvestments);
  }
};

export {};
