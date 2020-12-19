<template>
<div class="flex flex-row ">

    <transition name="slide-fade">

        <aside class=" md:flex flex-col bg-green-50 py-6 w-64 sticky min-h-screen  shadow-lg">
            <div class="text-gray-600 text-xl font-bold px-4 py-2">
                Guide
            </div>
            <div class="flex w-full py-4 ">

                <ul class="flex flex-col w-full max-h-96 overflow-auto">
                    <li class="relative w-full " v-for="(component, index) in components" :key="index">
                        <router-link active-class="text-green-700 bg-green-200" class="relative flex  text-gray-600 w-full pl-4 p-2 items-center" :to="'/guide/'+component.path">

                            <span class="text-sm py-1 whitespace-nowrap">{{ component.name }}</span>
                        </router-link>
                    </li>
                </ul>
            </div>
        </aside>
    </transition>
    <section class="w-full transition-all overflow-x-hidden" style="overflow-y: auto; max-height: calc(100vh - 64px)">
        <div class="w-full items-center sticky top-0 z-20 flex bg-gray-100">

        </div>
        <main class="pl-8 pr-16 pt-4 pb-32 w-full">
            <router-view></router-view>
        </main>
    </section>
</div>
</template>

<script>
import {
    routes
} from '@/router'
export default {
    name: "guide",
    computed: {
        components() {
            return routes.find((route) => route.path.includes('/guide')).children;
        }
    },

}
</script>

<style>

</style>
