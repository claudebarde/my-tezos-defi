export { matchers } from './client-matchers.js';

export const components = [
	() => import("../../src/routes/__layout.svelte"),
	() => import("../runtime/components/error.svelte"),
	() => import("../../src/routes/index.svelte"),
	() => import("../../src/routes/liquidity-baking.svelte"),
	() => import("../../src/routes/settings.svelte"),
	() => import("../../src/routes/profile.svelte"),
	() => import("../../src/routes/vaults.svelte"),
	() => import("../../src/routes/farms.svelte")
];

export const dictionary = {
	"": [[0, 2], [1]],
	"liquidity-baking": [[0, 3], [1]],
	"settings": [[0, 4], [1]],
	"profile": [[0, 5], [1]],
	"vaults": [[0, 6], [1]],
	"farms": [[0, 7], [1]]
};