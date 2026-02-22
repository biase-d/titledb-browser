import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true
	},
	build: {
		rollupOptions: {
			onwarn(warning, warn) {
				if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('@auth/core')) return
				warn(warning)
			}
		}
	}
});
