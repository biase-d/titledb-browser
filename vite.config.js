import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		rollupOptions: {
			onwarn(warning, warn) {
				if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('@auth/core')) return
				warn(warning)
			}
		}
	}
});
