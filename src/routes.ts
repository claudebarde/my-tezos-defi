import Home from "./routes/Home.svelte";
import Farms from "./routes/Farms.svelte";
import LiquidityBaking from "./routes/LiquidityBaking.svelte";
import Vaults from "./routes/Vaults.svelte";
import Profile from "./routes/Profile.svelte";
import Settings from "./routes/Settings.svelte";

export default {
  "/": Home,
  "/farms/:platform?": Farms,
  "/liquidity-baking": LiquidityBaking,
  "/vaults": Vaults,
  "/profile/:address": Profile,
  "/settings": Settings
};
