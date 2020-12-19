<template>
<default-layout>
    <router-view />
</default-layout>
</template>

<script>
import DefaultLayout from "./layouts/DefaultLayout/DefaultLayout.vue";

export default {
    name: "app",

    components: {
        DefaultLayout,
    },
};
</script>

<style>
</style>
