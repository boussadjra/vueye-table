import { defaultColors, defineConfig } from 'histoire'

import { HstVue } from '@histoire/plugin-vue'

export default defineConfig({
    plugins: [HstVue()],
    setupFile: '/src/histoire-setup.ts',
    theme: {
        darkClass: 've-dark',
        colors: {
            primary: defaultColors.cyan,
        },
    },
    vite: {
        plugins: [
            {
                name: 'vite-plugin-vue',
                config(config) {
                    config.build.lib = false
                    config.build.rollupOptions.external = []
                },
            },
        ],
    },
})
