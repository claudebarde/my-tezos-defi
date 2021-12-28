import { writable } from "svelte/store";
import type { AvailableToken } from "../../types";

interface Toast {
  id: number;
  type: "default" | "info" | "success" | "error";
  title: string;
  text: string;
  dismissable: boolean;
  token?: AvailableToken;
  icon?: string;
}
let initialState: Toast[] = [
  {
    id: 333,
    type: "info",
    title: "Test",
    text: "this is a test",
    dismissable: true
  },
  {
    id: 334,
    type: "info",
    title: "Test",
    text: "this is a test",
    dismissable: true
  }
];
const delay = 6000;

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  addToast: (newToast: Omit<Toast, "id">) => {
    store.update(store => {
      const identicalToast = store.find(toast => newToast.text === toast.text);
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
