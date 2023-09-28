<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'

export type OptionValue = string | number | boolean | object | symbol

interface Option {
    value: OptionValue
    label: string
}

const props = withDefaults(
    defineProps<{
        options: Option[]
        modelValue: string | number
        label: string
        defaultValue?: Option
    }>(),
    {
        options: () => [],
        modelValue: '',
        label: '',
    },
)
const target = ref<HTMLElement | null>(null)

onClickOutside(target, () => {
    isOpen.value = false
})

const isOpen = ref(false)
const selectedIndex = ref(-1)

const selectedOption = computed(() => props.options[selectedIndex.value] ?? props.defaultValue)

const labelId = `dropdown-label-${Math.random().toString(36).substring(2, 9)}`

function toggleMenu() {
    isOpen.value = !isOpen.value
}

function selectOption(index: number) {
    selectedIndex.value = index
    isOpen.value = false
    emit('update:modelValue', selectedOption.value.value)
}

watchEffect(() => {
    const index = props.options.findIndex((option) => option.value === props.modelValue)
    if (index !== -1) {
        selectedIndex.value = index
    }
})

const emit = defineEmits<{
    (event: 'update:modelValue', value: OptionValue): void
}>()
</script>

<template>
    <div class="relative">
        <button
            type="button"
            class="bg-slate-100 dark:bg-primary-900 border flex items-center space-x-2 rtl:space-x-reverse border-primary-300 dark:border-primary-900 rounded-md shadow-sm py-2 px-4 text-sm font-medium text-slate-700 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="toggleMenu"
            :aria-expanded="isOpen"
            :aria-haspopup="true"
            ref="buttonRef"
        >
            <span>{{ selectedOption.label }}</span>
            <span class="i-solar-alt-arrow-down-linear"></span>
        </button>

        <div
            v-if="isOpen"
            class="origin-top-right bottom-full absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-slate-100 dark:bg-primary-950 ring-1 ring-black ring-opacity-5 focus:outline-none z-40"
            role="menu"
            aria-orientation="vertical"
            :aria-labelledby="labelId"
            ref="target"
        >
            <div class="py-1" role="none">
                <button
                    v-for="(option, index) in options"
                    :key="index"
                    :class="{
                        'text-slate-700 bg-slate-200 dark:text-slate-300 dark:bg-primary-900 ': index === selectedIndex,
                        'text-slate-700 dark:text-slate-50 hover:bg-slate-50': index !== selectedIndex,
                    }"
                    class="block px-4 py-2 text-sm text-left w-full text-slate-700 dark:text-slate-50 hover:bg-slate-200 hover:text-slate-900 focus:outline-none focus:bg-slate-100 focus:text-slate-900 dark:hover:text-slate-300 dark:hover:bg-primary-900"
                    role="menuitem"
                    @click="selectOption(index)"
                >
                    {{ option.label }}
                </button>
            </div>
        </div>
    </div>
</template>
