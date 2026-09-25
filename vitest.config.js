import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import path from 'path'

// import.meta.dirname rather than __dirname: Vite's native config loader, which
// becomes the default in a future major, does not provide the CommonJS globals
const root = import.meta.dirname

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        environment: 'jsdom',
        globals: true,
        alias: {
            '$lib': path.resolve(root, './src/lib'),
            '$app': path.resolve(root, './node_modules/@sveltejs/kit/src/runtime/app'),
        },
        deps: {
            inline: [/svelte/],
        },
    },
    resolve: {
        conditions: ['browser', 'development']
    }
})
