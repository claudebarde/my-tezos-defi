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
          // dedupe @airgap/beacon-sdk
          // I almost have no idea why it needs `cjs` on dev and `esm` on build, but this is how it works 🤷‍♂️
          "@airgap/beacon-sdk": path.resolve(
            path.resolve(),
            /*`./node_modules/@airgap/beacon-sdk/dist/${
              process.env.NODE_ENV === "production" ? "esm" : "cjs"
            }/index.js`*/
            `./node_modules/@airgap/beacon-sdk/dist/walletbeacon.min.js`
          ),
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
