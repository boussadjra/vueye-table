<script setup lang="ts">
import DarkModeToggle from '../DarkModeToggle.vue'
import coloredLogo from '../../../assets/imgs/colored-logo.png'
</script>
<template>
    <header class="app-header">
        <div class="header-button">
            <button type="button" class="button" aria-label="Open navigation">
                <Icon name="solar:hamburger-menu-broken" size="24" />
            </button>
        </div>
        <div class="header-logo">
            <a aria-label="Home page" href="/">
                <span class="sr-only">Vueye table logo</span>
                <img :src="coloredLogo" alt="Vueye logo" class="logo"
            /></a>
        </div>

        <div class="header-links">
            <DarkModeToggle />

            <a class="github-link" aria-label="GitHub" href="https://github.com/boussadjra/vueye-table">
                <span class="sr-only">GitHub repo</span>
                <span class="i-tabler-brand-github-filled" />
            </a>
        </div>
    </header>
</template>

<style>
.app-header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    background-color: #f9fafb; /* bg-primary-50 */
    padding: 0.5rem 1rem; /* px-4 py-2 */
    box-shadow:
        0 4px 6px -1px rgba(79, 70, 229, 0.1),
        0 2px 4px -1px rgba(79, 70, 229, 0.06); /* shadow-md shadow-indigo-900/5 */
    transition: all 0.5s ease; /* transition duration-500 */
}

.dark .app-header {
    background-color: #1f2937; /* bg-slate-900 */
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-md shadow-black/5 */
}

.header-button {
    margin-right: 1.5rem; /* mr-6 */
    display: flex; /* flex */
}

.button {
    position: relative; /* relative */
}

.header-logo {
    position: relative; /* relative */
    display: flex; /* flex */
    flex-grow: 1; /* flex-grow */
    align-items: center; /* items-center */
}

.logo {
    height: 3rem; /* h-12 */
    width: auto; /* w-auto */
}

.header-links {
    position: relative; /* relative */
    display: flex; /* flex */
    justify-content: flex-end; /* justify-end */
    align-items: center; /* items-center */
    gap: 1rem; /* gap-4 */
    color: #374151; /* text-slate-400 */
}

.github-link {
    display: flex; /* flex */
    align-items: center; /* items-center */
    justify-content: center; /* justify-center */
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
</style>
