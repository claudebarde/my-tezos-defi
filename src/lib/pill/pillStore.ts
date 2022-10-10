import { writable } from "svelte/store";

export enum PillTextType {
  XTZ_PRICE,
  INFO
}

interface PillState {
  shape: "normal" | "large";
  text: string;
  textType: PillTextType;
  acceptingNewText: boolean;
  show: boolean;
  hidingTimeout: NodeJS.Timeout;
}

let initialState: PillState = {
  shape: "normal",
  text: "Welcome",
  textType: PillTextType.INFO,
  acceptingNewText: true,
  show: true,
  hidingTimeout: undefined // reference to a timeout after which the pill shows up again
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  addText: (text: string, type: PillTextType, visibleFor: number) => {
    setTimeout(() => store.update(store => ({...store, acceptingNewText: true})), visibleFor);

    store.update(store => {
      if (store.acceptingNewText) {
        return {...store, text, textType: type, acceptingNewText: false}
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

      return {...store, show: false, hidingTimeout: timeoutRef}
    });
  },
  switchShape: (shape: PillState["shape"]) => {
    store.update(store => ({...store, shape}));
  }
};

export default state;
