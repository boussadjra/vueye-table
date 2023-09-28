/// <reference types="vitest" />

import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import path from 'path'
import { resolve } from 'pathe'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    resolve: {
        alias: {
            '@/': `${path.resolve(__dirname, 'src')}/`,
        },
    },
    plugins: [
        vue({
            include: [/\.vue$/, /\.md$/],
        }),

        dts({
            insertTypesEntry: true,
        }),
        AutoImport({
            imports: ['vue', 'vue-router', 'vue-i18n', 'vue/macros', '@vueuse/head', '@vueuse/core'],
            dts: 'src/auto-imports.d.ts',
            eslintrc: {
                enabled: true,
            },
        }),
    ],
    build: {
        lib: {
            entry: [resolve(__dirname, 'src/components/index.ts')],
            name: 'vueye-table',
            fileName: 'vueye-table',
        },
        watch: {
            include: [resolve(__dirname, 'src')],
        },

        rollupOptions: {
            external: ['vue'],
            output: {
                exports: 'named',
                globals: {
                    vue: 'Vue',
                },
            },
        },
    },
    optimizeDeps: {
        exclude: ['vue'],
    },
    test: {
        include: ['test/**/*.test.ts'],
        environment: 'jsdom',
        globals: true,
        deps: {
            inline: ['@vue'],
        },
        alias: {
            '@/': `${path.resolve(__dirname, 'src')}/`,
        },
    },
})
