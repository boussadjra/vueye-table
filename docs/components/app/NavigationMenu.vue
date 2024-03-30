<script setup>
defineProps({
    items: {
        type: Array,
        required: true,
    },
})

const showChildren = ref({})
</script>

<template>
    <ul class="px-1">
        <li
            v-for="item in items"
            :key="item.title"
            class="p-2"
            :class="
                showChildren[item.title]
                    ? 'border-l-2 border-primary bg-slate-50 dark:bg-slate-950'
                    : 'bg-slate-100 dark:bg-slate-900'
            "
        >
            <router-link v-if="!item.children" :to="item._path" class="hover:underline font-extralight p-1 text-sm">{{
                item.title
            }}</router-link>
            <div
                v-else
                class="p-2 flex w-full items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950 rounded-md p-1"
                @click="showChildren[item.title] = !showChildren[item.title]"
            >
                <span>{{ item.title }}</span>
                <span
                    class="i-solar-alt-arrow-right-linear justify-self-end"
                    :class="showChildren[item.title] ? 'transform rotate-90' : ''"
                />
            </div>
            <AppNavigationMenu v-if="item.children" v-show="showChildren[item.title]" :items="item.children" />
        </li>
    </ul>
</template>
