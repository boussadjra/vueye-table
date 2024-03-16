import { defineNuxtPlugin } from '#app'
import 'vueye-table/dist/default.css'
import { VueyeTable } from 'vueye-table'
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('VueyeTable', VueyeTable)
})
