<script setup lang="ts"></script>
<template>
    <header class="flex w-full justify-center bg-background sticky z-50 top-0">
        <Menubar class="w-full flex justify-center h-16 items-center px-4">
            <!-- Add logo to the left -->
            <img src="/imgs/colored-logo.png" alt="Vueye Table Logo" class="mr-auto h-12" />
            <MenubarMenu>
                <MenubarTrigger class="cursor-pointer">
                    <span class="font-regular"> Guide </span>
                    <span class="i-solar-alt-arrow-down-linear ms-1"></span>
                </MenubarTrigger>
                <MenubarContent>
                    <MenubarItem> Get Started</MenubarItem>
                    <MenubarItem> Installation </MenubarItem>
                </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger class="cursor-pointer">
                    <span class="font-regular"> API Reference </span>
                </MenubarTrigger>
            </MenubarMenu>
            <MenubarMenu>
                <MenubarTrigger class="cursor-pointer">
                    <span class="font-regular"> Examples </span>
                </MenubarTrigger>
            </MenubarMenu>
            <!-- Add icon to trigger dark mode -->
            <div class="ml-auto">
                <Button variant="ghost">
                    <span class="i-solar-magnifer-linear"></span>
                </Button>
                <Button variant="ghost" @click="() => toggleDark()">
                    <span :class="[isDark ? 'i-solar-sun-linear' : 'i-solar-moon-linear']"></span>
                </Button>
                <!-- Add link to GitHub -->
                <a href="https://github.com/boussadjra/vueye-table" target="_blank" class="ml-2">
                    <span class="i-tabler-brand-github"></span>
                    <span class="sr-only">GitHub Repo</span>
                </a>
            </div>
        </Menubar>
    </header>
</template>

<style scoped></style>
