import { resolve } from 'node:path';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'dist',
    base: '/vbrick-loader',
    envDir: import.meta.dirname,
    build: {
        outDir: resolve(import.meta.dirname, 'dist/demo'),
        rolldownOptions: {
            tsconfig: 'tsconfig.demo.json',
            input: {
                main: resolve(import.meta.dirname, 'demo/index.html'),
                // example is intended for local development rather than building
                // example: resolve(import.meta.dirname, 'demo/example.html'),
            },
            output: {
                entryFileNames(chunkInfo) {
                    return 'assets/[name].js';
                },
                assetFileNames(chunkInfo) {
                    return 'assets/[name][extname]';
                },
                chunkFileNames(chunkInfo) {
                    return 'assets/[name].js';
                },
            },
        },
    },
    plugins: [preact()],
});
