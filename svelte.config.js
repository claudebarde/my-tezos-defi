import adapter from "@sveltejs/adapter-netlify";
import preprocess from "svelte-preprocess";
import path from "path";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),

  kit: {
    adapter: adapter(),
    vite: {
      resolve: {
        alias: {
          "@airgap/beacon-sdk": "src/walletbeacon.min.js",
          // polyfills
          "readable-stream": "vite-compatible-readable-stream",
          stream: "vite-compatible-readable-stream"
        }
      },
      define: {
        global: {}
      }
    }
  }
};

export default config;
