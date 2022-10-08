<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { AvailableToken } from "../types";
  import { shuffle } from "../utils";

  let shuffleInterval;
  let tokens: Array<string> = [];

  onMount(() => {
    tokens = shuffle(Object.keys(AvailableToken));
    shuffleInterval = setInterval(() => {
      tokens = shuffle(Object.keys(AvailableToken));
    }, 20_000);
  });

  onDestroy(() => {
    clearInterval(shuffleInterval);
  });
</script>

<div class="bubbles">
  {#each tokens as token, index (token)}
    {@const min = 0}
    {@const max = 5}
    <div
      class="bubble"
      style={`animation-duration: ${
        index % 2 === 0 ? "20s" : "10s"
      };animation-delay:${Math.floor(Math.random() * (max - min + 1)) + min}s`}
    >
      <img
        src={`/tokens/${token}.png`}
        alt={`${token}-icon`}
        style={`width:${index % 2 === 0 ? "32px" : "48px"}`}
      />
    </div>
  {/each}
</div>
