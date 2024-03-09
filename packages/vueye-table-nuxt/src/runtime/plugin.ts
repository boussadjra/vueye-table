import { defineNuxtPlugin } from '#app'
import { VueyeTable } from 'vueye-table'
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('VueyeTable', VueyeTable as any)
})
