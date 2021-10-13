import { writable } from "svelte/store";

interface Toast {
  id: number;
  type: "default" | "info" | "success" | "error";
  text: string;
  dismissable: boolean;
}
let initialState: Toast[] = [];
const delay = 6000;

const store = writable(initialState);

const state = {
  subscribe: store.subscribe,
  addToast: (newToast: Omit<Toast, "id">) => {
    store.update(store => {
      if (!store.find(toast => newToast.text === toast.text)) {
        const newId = Math.floor(Math.random() * Date.now());
        setTimeout(() => state.removeToast(newId), delay);
        return [...store, { ...newToast, id: newId }];
      }
    });
  },
  removeToast: (id: number) => {
    store.update(store => [...store.filter(toast => toast.id !== id)]);
  }
};

export default state;
