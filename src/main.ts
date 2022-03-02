import "./styles/index.scss";

import App from "./App.svelte";

const app = new App({
  target: document.body,
  intro: false
});

export default app;
