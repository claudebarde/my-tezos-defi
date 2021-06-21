<script lang="ts">
  import type { KolibriOvenData } from "../../types";
  import { shortenHash } from "../../utils";

  export let oven: KolibriOvenData;
</script>

<style lang="scss">
  .oven-container {
    width: 90%;
    padding: 10px;

    .oven-container__row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    a {
      text-decoration: none;
      color: inherit;

      &:hover {
        text-decoration: underline;
      }
    }
  }
</style>

<div class="oven-container">
  <div class="oven-container__row">
    <div>
      <a
        href={`https://better-call.dev/mainnet/${oven.address}/operations`}
        target="_blank"
        rel="noopener noreferrer nofollow"
      >
        {shortenHash(oven.address)}
      </a>
    </div>
    <div class="buttons">
      <button class="button kusd">Borrow kUSD</button>
      <button class="button kusd">Pay back kUSD</button>
      <button class="button kusd">Withdraw ꜩ</button>
      <button class="button kusd">Deposit ꜩ</button>
    </div>
  </div>
  <br />
  <div class="oven-container__row">
    <div>Borrowed: {+oven.borrowed / 10 ** 18} kUSD</div>
    <div>Locked: {+oven.locked / 10 ** 6} ꜩ</div>
  </div>
</div>
