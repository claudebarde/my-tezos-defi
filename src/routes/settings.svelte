<script lang="ts">
  import store from "../store";
  import ProfileHeader from "$lib/ProfileHeader.svelte";
  import config from "../config";
  import { LocalStorage } from "../localStorage";

  const updateRpcUrl = event => {
    const url = event.target.value;
    if (config.availableRpcUrls.includes(url)) {
      $store.localStorage.setRpcUrl(url);
      $store.Tezos.setRpcProvider(url);
    }
  };
</script>

<style lang="scss">
  @import "../styles/settings.scss";

  .settings {
    text-align: center;

    select {
      border: none;
      padding: 10px;
      font-size: 0.9rem;
      color: inherit;
      outline: none;
      cursor: pointer;
      background-color: $blizzard-blue;
      border-radius: $std-border-radius;
    }
  }
</style>

<div class="container">
  {#if $store.userAddress}
    <ProfileHeader />
  {/if}
  <div class="settings">
    <div>
      <p>Change RPC URL</p>
      <p>
        <select on:change={updateRpcUrl}>
          {#each config.availableRpcUrls as url}
            <option value={url} selected={url === LocalStorage.getRpcUrl()}>
              {url}
            </option>
          {/each}
        </select>
      </p>
    </div>
  </div>
</div>
