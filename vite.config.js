import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

const wasmBase64Loader = {
    name: 'wasm-base64-loader',
    transform(code, id) {
        if (id.endsWith('.wasm?base64')) {
            const filePath = id.slice(0, -7); // Remove ?base64
            const buffer = fs.readFileSync(filePath);
            const base64 = buffer.toString('base64');

            return {
                code: `export default "${base64}";`,
                map: null
            };
        }
    }
};

export default defineConfig({
	plugins: [
        sveltekit(),
        wasmBase64Loader
    ]
});
