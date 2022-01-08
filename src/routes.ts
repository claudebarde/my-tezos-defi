import { wrap } from "svelte-spa-router/wrap";
import Landing from "./components/Landing/Landing.svelte";
import Tokens from "./components/Tokens/Tokens.svelte";
import Farms from "./components/Farms/Farms.svelte";
import Stats from "./components/Stats/Stats.svelte";
import Profile from "./components/Profile/Profile.svelte";
import Settings from "./components/Settings/Settings.svelte";
import Traffic from "./components/Traffic/Traffic.svelte";
import Vaults from "./components/Vaults/Vaults.svelte";
import Exchange from "./components/Exchange/Exchange.svelte";
import LiquidityBaking from "./components/LiquidityBaking/LiquidityBaking.svelte";
import Swaps from "./components/Swaps/Swaps.svelte";

export default {
  "/": Landing,
  "/tokens": Tokens,
  "/farms": Farms,
  "/stats": Stats,
  "/profile/:useraddress": Profile,
  "/settings": Settings,
  "/traffic": wrap({
    component: Traffic,
    props: {
      filterOps: { opType: "general" }
    }
  }),
  "/vaults": Vaults,
  "/exchange": Exchange,
  "/liquidity-baking": LiquidityBaking,
  "/swaps": Swaps
};
