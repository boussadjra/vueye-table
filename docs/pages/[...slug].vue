<script setup lang="ts">
import { Input } from '@/components/ui/input'

const { data: navigation } = await useAsyncData('navigation', () => fetchContentNavigation())
definePageMeta({
    layout: 'docs',
})
</script>
<template>
    <aside class="w-80 p-6 bg-slate-50 dark:bg-slate-800 h-full min-h-screen sticky top-16">
        <!-- tailwind search input -->
        <div class="relative w-full max-w-sm items-center">
            <Input id="search" type="text" placeholder="Search..." class="pl-10" aria-label="Search" />
            <span class="absolute start-0 inset-y-0 flex items-center justify-center px-2">
                <span class="size-6 text-muted-foreground i-solar-magnifer-linear" />
            </span>
        </div>
        <nav class="mt-4">
            <AppNavigationMenu :items="navigation" />
        </nav>
    </aside>
    <article class="prose lg:prose-lg dark:prose-invert prose- p-5 pt-16">
        <ContentDoc>
            <template #not-found>
                <div class="container w-full not-prose">
                    <div class="flex flex-col items-center justify-center h-full w-full">
                        <h1 class="text-4xl font-bold text-center text-slate-600 dark:text-slate-200">404</h1>
                        <p class="text-lg font-light text-center text-slate-500 dark:text-slate-300">Page not found</p>
                    </div>
                </div>
            </template>
        </ContentDoc>
    </article>
</template>
