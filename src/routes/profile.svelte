<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import store from "../store";

  onMount(async () => {
    if ($page?.params?.slug) {
      const profileAddress = $page.params.slug;

      await goto(`/profile/${profileAddress}`);
    } else if ($store.userAddress) {
      await goto(`/profile/${$store.userAddress}`);
    } else {
      await goto("/index");
    }
  });
</script>
