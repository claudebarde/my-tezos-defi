import { writable } from "svelte/store";

const initialState = {
  quipuWorker: undefined
};

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  updateQuipuWorker: worker =>
    store.update(store => ({ ...store, quipuWorker: worker }))
};

export default state;
