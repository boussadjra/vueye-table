import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'
import type { ModuleOptions } from '@nuxt/schema'

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'nuxt-vueye-table',
        configKey: 'vueye-table',
        compatibility: {
            nuxt: '^3.0.0',
        },
    },

    setup(options, nuxt) {
        const resolver = createResolver(import.meta.url)

        addPlugin(resolver.resolve('./runtime/plugin'))

        // nuxt.options.css.push('vueye-table/dist/default.css')
    },
})
