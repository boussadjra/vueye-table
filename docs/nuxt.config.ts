// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt', '@nuxt/content', 'nuxt-vueye-table', '@vueuse/nuxt'],
    css: ['@/assets/css/main.css'],
    content: {
        highlight: {
            theme: {
                // Default theme (same as single string)
                default: 'github-light',
                light: 'github-light',
                // Theme used if `html.dark`
                dark: 'one-dark-pro',
                // Theme used if `html.sepia`
                sepia: 'monokai',
            },
        },
    },
    shadcn: {
        /**
         * Prefix for all the imported component
         */
        prefix: '',
        /**
         * Directory that the component lives in.
         * @default "./components/ui"
         */
        componentDir: './components/ui',
    },
})
