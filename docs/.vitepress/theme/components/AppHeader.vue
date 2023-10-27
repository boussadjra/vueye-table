<script setup lang="ts">
import DarkModeToggle from './DarkModeToggle.vue'
import coloredLogo from '../assets/colored-logo.png'
</script>
<template>
    <header
        class="sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-primary-50 px-4 py-2 shadow-md shadow-indigo-900/5 transition duration-500 dark:shadow-xl sm:px-6 lg:px-8 dark:bg-primary-950"
    >
        <div class="mr-6 flex lg:hidden">
            <button type="button" class="relative" aria-label="Open navigation">
                <Icon name="solar:hamburger-menu-broken" size="24" />
            </button>
        </div>
        <div class="relative flex flex-grow basis-0 items-center">
            <a aria-label="Home page" href="/">
                <span class="sr-only">Vueye table logo</span>
                <img :src="coloredLogo" alt="Vueye logo" class="h-12 w-auto"
            /></a>
        </div>
        <div class="-my-5 mr-6 sm:mr-8 md:mr-0">
            <button
                type="button"
                class="group flex h-6 w-6 items-center justify-center sm:justify-start md:h-auto md:w-80 md:flex-none md:rounded-lg md:py-2.5 md:pl-4 md:pr-3.5 md:text-sm md:ring-1 md:ring-slate-200 md:hover:ring-slate-300 dark:md:bg-primary-900/75 dark:md:ring-inset dark:md:ring-white/5 dark:md:hover:bg-slate-700/40 dark:md:hover:ring-slate-500 lg:w-96"
            >
                <Icon name="solar:magnifer-linear" size="20" class="text-slate-500 dark:text-slate-400" />

                <span class="sr-only md:not-sr-only md:ml-2 md:text-slate-500 md:dark:text-slate-400">Search docs</span>
                <span class="hidden md:flex md:ml-auto md:text-slate-500 md:dark:text-slate-400">
                    <AppKBD>CTRL K</AppKBD>
                </span>
            </button>
        </div>
        <div class="relative flex basis-0 justify-end items-center gap-4 sm:gap-6 md:flex-grow text-slate-400">
            <DarkModeToggle />

            <a
                class="group flex items-center justify-center"
                aria-label="GitHub"
                href="https://github.com/boussadjra/vueye-table"
            >
                <span class="sr-only">GitHub repo</span>
                <span class="i-tabler-brand-github-filled" />
            </a>
        </div>
    </header>
</template>

<style scoped>
.centered {
    display: grid;
    place-items: center;
}
</style>
