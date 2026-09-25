import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Lightning CSS packs a browser version as major<<16 | minor<<8 | patch
const version = (major) => major << 16

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true
	},
	css: {
		// Vite 8 transforms CSS with Lightning CSS, which only emits a vendor
		// prefix for the browsers named here. Given no targets it emits none,
		// and where a prefixed declaration was written last it kept that one and
		// dropped the standard property - which is how .app-header ended up with
		// only -webkit-backdrop-filter, and so no blur in Firefox at all
		lightningcss: {
			targets: {
				chrome: version(87),
				edge: version(87),
				firefox: version(103),
				safari: version(15),
				ios_saf: version(15)
			}
		}
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
