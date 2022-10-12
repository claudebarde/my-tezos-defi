import { writable, get } from "svelte/store";
import generalStore from "../../store"
import {formatTokenAmount} from "../../utils"

export enum PillTextType {
  XTZ_PRICE,
  TOKEN_PRICE,
  XTZ_INCOME,
  HARVEST_REWARDS,
  INFO,
  SUCCESS,
  ERROR
}

export enum PillBehavior {
  NONE,
  SHAKING_TOP
}

interface PillState {
  shape: "normal" | "large";
  text: string;
  textType: PillTextType;
  active: boolean;
  show: boolean;
  hidingTimeout: NodeJS.Timeout;
  behavior: PillBehavior;
  minimized: boolean;
}

let initialState: PillState = {
  shape: "normal",
  text: "Welcome",
  textType: PillTextType.INFO,
  active: false,
  show: true,
  hidingTimeout: undefined, // reference to a timeout after which the pill shows up again
  behavior: PillBehavior.NONE,
  minimized: false
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  update: (
    { text, type, visibleFor, newShape, noTimeout, force }:
      {
        text: string;
        type: PillTextType;
        visibleFor?: number;
        newShape?: PillState["shape"];
        noTimeout?: boolean;
        force?: boolean
      }
  ) => {
    // "force" is used to force the update of the pill state
    store.update(store_ => {
      // update can only happen if the pill is not active, if the update is forced and if the pill is visible
      if ((!store_.active || force) && store_.show) {
        if (!noTimeout) {
          let genStore = get(generalStore);
          setTimeout(() => store.update(store_ => ({
            ...store_,
            active: false,
            shape: "normal",
            text: `1 XTZ = ${formatTokenAmount(genStore.xtzExchangeRate, 2)} ${genStore.localStorage.getFavoriteFiat().code}`,
            textType: PillTextType.XTZ_PRICE,
          })), visibleFor || 3000);
        }
        return {...store_, text, textType: type, active: true, show: true, shape: newShape || store_.shape}
      } else {
        return store_
      }
    });
  },
  show: () => {
    store.update(store => ({...store, show: true}));
  },
  hide: (timeout?: number) => {
    let timeoutRef = setTimeout(() => store.update(store => ({ ...store, show: true })), timeout || 2000);
    
    store.update(store => {
      clearTimeout(store.hidingTimeout);

      if (!store.active) {
        return {...store, show: false, hidingTimeout: timeoutRef}
      } else {
        return store
      }
    });
  },
  switchShape: (shape: PillState["shape"]) => {
    store.update(store => ({...store, shape}));
  },
  reset: () => {
    store.update(store => ({...store, text: "Welcome", type: PillTextType.INFO, show: true, shape: "normal", active: false}));
  },
  behave: (behavior: PillBehavior, timeout?: number) => {
    setTimeout(() => store.update(store => ({ ...store, behavior: PillBehavior.NONE })), timeout || 1000);
    
    store.update(store => ({...store, behavior}));
  },
  minimize: () => {
    store.update(store => ({...store, minimized: true}));
  },
  maximize: () => {
    store.update(store => ({...store, minimized: false}));
  },
};

export default state;
