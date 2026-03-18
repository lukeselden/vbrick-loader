import { defineConfig } from 'tsdown';

export default defineConfig((_options) => {
    return {
        tsconfig: 'tsconfig.lib.json',
        entry: 'src/lib/vbrick-loader.ts',
        outDir: 'dist',
        clean: true,
        sourcemap: true,
        dts: true,
        format: 'esm',
        platform: 'browser',
        minify: true,
    };
});
