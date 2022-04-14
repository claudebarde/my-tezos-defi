import { writable } from "svelte/store";
import type { ToastType } from "./types";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  dismissable: boolean;
}
let initialState: Toast[] = [];
const delay = 6000;

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  addToast: (newToast: Omit<Toast, "id">) => {
    store.update(store => {
      const identicalToast = store.find(
        toast => newToast.message === toast.message
      );
      if (!identicalToast) {
        const newId = Math.floor(Math.random() * Date.now());
        setTimeout(() => state.removeToast(newId), delay);
        return [...store, { ...newToast, id: newId }];
      } else {
        return store;
      }
    });
  },
  removeToast: (id: number) => {
    store.update(store => [...store.filter(toast => toast.id !== id)]);
  }
};

export default state;
