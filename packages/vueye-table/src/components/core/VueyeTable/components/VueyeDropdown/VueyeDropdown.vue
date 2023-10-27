<script setup lang="ts">
import { DropdownProps, dropdownPropsDefaults, DropdownEmits } from './api'
import { MaybeRefOrGetter } from 'vue'
const props = withDefaults(defineProps<DropdownProps>(), dropdownPropsDefaults)

const isOpen = ref(false)
const selectedIndex = ref(-1)

const selectedOption = computed(() => {
    if (selectedIndex.value === -1) {
        return props.options[0]
    }
    return props.options[selectedIndex.value]
})

const labelId = `dropdown-label-${Math.random().toString(36).substring(2, 9)}`

function toggleMenu() {
    isOpen.value = !isOpen.value
}

function selectOption(index: number) {
    selectedIndex.value = index
    isOpen.value = false
    emit('update:modelValue', selectedOption.value.content)
}

watchEffect(() => {
    const index = props.options.findIndex((option) => option.content === props.modelValue)
    if (index !== -1) {
        selectedIndex.value = index
    }

    if (props.modelValue === undefined) {
        selectedIndex.value = -1
    }
})

const emit = defineEmits<DropdownEmits>()
</script>

<template>
    <div class="dropdown__wrapper">
        <button
            type="button"
            class="dropdown__trigger"
            @click="toggleMenu"
            :aria-expanded="isOpen"
            :aria-haspopup="true"
            ref="buttonRef"
        >
            <span>{{ selectedOption.label }}</span>
            <span class="i-solar-alt-arrow-down-linear"></span>
        </button>
        <div class="dropdown__overlay" v-if="isOpen" @click="toggleMenu"></div>
        <div v-if="isOpen" class="dropdown__menu" role="menu" aria-orientation="vertical" :aria-labelledby="labelId">
            <div class="py-1" role="none">
                <button
                    v-for="(option, index) in options"
                    :key="index"
                    :class="{
                        'dropdown__menu__item--selected ': index === selectedIndex,
                    }"
                    class="dropdown__menu__item"
                    role="menuitem"
                    @click="selectOption(index)"
                >
                    {{ option.label }}
                </button>
            </div>
        </div>
    </div>
</template>
<style>
.dropdown__wrapper {
    @apply relative;
}
.dropdown__trigger {
    @apply bg-slate-100 dark:bg-primary-900 border flex items-center space-x-2 rtl:space-x-reverse border-primary-300 dark:border-primary-900 rounded-md shadow-sm py-2 px-4 text-sm font-medium text-slate-700 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500;
}
.dropdown__menu {
    @apply origin-top-right bottom-full absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-100 dark:bg-primary-950 ring-1 ring-black ring-opacity-5 focus:outline-none z-[45];
}
.dropdown__menu__item {
    @apply text-slate-700 block px-4 py-2 text-sm text-left w-full  dark:text-slate-50 hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:bg-slate-100 focus:text-slate-900 dark:hover:text-slate-300 dark:hover:bg-primary-900;
}
.dropdown__menu__item--selected {
    @apply bg-slate-200 dark:text-slate-300 dark:bg-primary-900;
}
.dropdown__overlay {
    @apply fixed top-0 left-0 inset-0 z-40 bg-transparent cursor-default;
}
</style>
