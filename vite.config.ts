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
                example: resolve(import.meta.dirname, 'demo/example.html'),
            },
        },
    },
    plugins: [preact()],
});
