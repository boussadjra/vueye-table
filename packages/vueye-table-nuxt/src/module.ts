import { defineNuxtModule, addPlugin, createResolver } from '@nuxt/kit'

export interface ModuleOptions {
    unstyled?: boolean
}

export default defineNuxtModule<ModuleOptions>({
    meta: {
        name: 'vueye-table-nuxt',
        configKey: 'vueyeTable',
        compatibility: {
            nuxt: '^3.0.0',
        },
    },
    defaults: {
        unstyled: false,
    },
    setup(options, nuxt) {
        const resolver = createResolver(import.meta.url)

        addPlugin(resolver.resolve('./runtime/plugin'))

        nuxt.options.css.push('../node_modules/vueye-table/dist/default.css')
    },
})
