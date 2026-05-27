import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		alias: {
			$types: 'src/lib/types',
			$components: 'src/lib/components',
			$server: 'src/lib/server'
		}
	}
};

export default config;
