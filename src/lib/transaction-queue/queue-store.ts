import type { WalletParamsWithKind } from "@taquito/taquito";
import { writable } from "svelte/store";
import type { QueuedTx } from "../../types";

let initialState: {
  nextId: number;
  queue: QueuedTx[];
} = {
  nextId: 0,
  queue: []
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  addToQueue: (
    newTxs: Array<{ tx: WalletParamsWithKind; description: string }>
  ) => {
    store.update(store => ({
      nextId: store.nextId + newTxs.length,
      queue: [
        ...store.queue,
        ...newTxs.map((tx, i) => ({ id: store.nextId + ++i, ...tx }))
      ]
    }));
  },
  removeFromQueue: (id: number) => {
    store.update(store => ({
      nextId: --store.nextId,
      queue: [...store.queue.filter(tx => tx.id !== id)]
    }));
  },
  emptyQueue: () => {
    store.update(_ => ({ nextId: 0, queue: [] }));
  }
};

export default state;
