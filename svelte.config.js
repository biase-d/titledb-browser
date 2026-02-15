import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		warningFilter: (warning) => {
			const ignore = [
				'a11y_label_has_associated_control',
				'a11y_no_noninteractive_element_interactions',
				'state_referenced_locally',
			]
			return !ignore.includes(warning.code)
		}
	},
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter()
	}
};

export default config;
