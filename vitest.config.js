import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'
import path from 'path'

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        environment: 'jsdom',
        globals: true,
        alias: {
            '$lib': path.resolve(__dirname, './src/lib'),
            '$app': path.resolve(__dirname, './node_modules/@sveltejs/kit/src/runtime/app'),
        },
        deps: {
            inline: [/svelte/],
        },
    },
    resolve: {
        conditions: ['browser', 'development']
    }
})
