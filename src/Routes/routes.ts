import Main from "./Main.svelte";
import TokenPage from "./TokenPage.svelte";
import Profile from "./Profile.svelte";
import Swaps from "../lib/Swaps/Swaps.svelte";

export default {
  "/": Main,
  "/token/:tokenSymbol": TokenPage,
  "/profile": Profile,
  "/swaps": Swaps
};
