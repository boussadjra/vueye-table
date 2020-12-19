<template>
<div>
    <nav class="h-48 shadow-md lg:h-16 w-full sticky overflow-hidden top-0 z-20 p-4 bg-green-800 text-green-100 flex flex-col lg:flex-row items-center justify-between">
        <h1 class="logo text-3xl font-bold text-yellow-300">VUEYETABLE</h1>

        <ul class="flex flex-row justify-between w-10/12 sm:w-6/12 lg:w-4/12 text-sm uppercase cursor-pointer">
            <li class="min-w-max">
                <router-link to="/" exact active-class="text-yellow-300">Home</router-link>
            </li>
            <li class="min-w-max">
                <router-link to="/guide" active-class="text-yellow-300">Guide</router-link>
            </li>

            <li class="min-w-max">
                <router-link to="/about" active-class="text-yellow-300">About me</router-link>
            </li>
        </ul>

        <div class="uppercase text-green-200 cursor-pointer">
            <a href="https://github.com/boussadjra/vueye-table" target="_blank" rel="noopener noreferrer">
                <button>
                    Github
                </button>

            </a>
        </div>
    </nav>

    <main class="overflow-y-auto max-h-screen pb-20">
        <slot></slot>
    </main>
</div>
</template>

<script>
import IconLogoGithub from "@/devComponents/icons/IconLogoGithub.vue";

export default {
    components: {

        IconLogoGithub,
    },
};
</script>

<style>
</style>
