<script setup lang="ts">
import { Content, useData, useRouter } from 'vitepress'
import AppHeader from './components/AppHeader.vue'
import AppHero from './components/AppHero.vue'
// https://vitepress.dev/reference/runtime-api#usedata
const { site, frontmatter, page } = useData()
</script>

<template>
    <AppHeader />
    <main class="p-2 min-h-screen text-gray-700 dark:text-gray-200">
        <div v-if="page.isNotFound" class="grid place-content-center">
            <h1>
                <span class="not-found text-9xl text-red-500">404</span>
                <br />
                <span class="text-3xl">Page not found</span>
            </h1>
        </div>

        <AppHero v-else-if="page.frontmatter.home" />
        <Content
            v-else
            class="text-gray-700 bg-slate-100 dark:bg-slate-800 dark:text-gray-200 p-8 h-full min-h-screen prose-base prose-slate dark:prose-invert"
        />
    </main>
</template>
