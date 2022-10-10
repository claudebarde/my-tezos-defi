import { writable } from "svelte/store";

export enum PillTextType {
  XTZ_PRICE,
  TOKEN_PRICE,
  XTZ_INCOME,
  INFO
}

interface PillState {
  shape: "normal" | "large";
  text: string;
  textType: PillTextType;
  acceptingNewText: boolean;
  show: boolean;
  mustStayOnScreen: boolean;
  hidingTimeout: NodeJS.Timeout;
}

let initialState: PillState = {
  shape: "normal",
  text: "Welcome",
  textType: PillTextType.INFO,
  acceptingNewText: true,
  show: true,
  mustStayOnScreen: false,
  hidingTimeout: undefined // reference to a timeout after which the pill shows up again
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  // TODO: make the parameter an object
  addText: (
    { text, type, visibleFor, newShape }:
    { text: string, type: PillTextType, visibleFor?: number, newShape?: PillState["shape"] }
  ) => {
    
    store.update(store_ => { 
      if (store_.acceptingNewText) {
        setTimeout(() => store.update(store_ => ({...store_, acceptingNewText: true, shape: "normal"})), visibleFor || 3000);
        return {...store_, text, textType: type, acceptingNewText: false, show: true, shape: newShape || store_.shape}
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

      if (store.mustStayOnScreen === false) {
        return {...store, show: false, hidingTimeout: timeoutRef}
      } else {
        return store
      }
    });
  },
  switchShape: (shape: PillState["shape"]) => {
    store.update(store => ({...store, shape}));
  }
};

export default state;
