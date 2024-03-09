<script setup lang="ts">
import { DropdownProps, dropdownPropsDefaults, DropdownEmits } from './api'
import ChevronDownIcon from '../icons/ChevronDownIcon.vue'

const props = withDefaults(defineProps<DropdownProps>(), dropdownPropsDefaults)

const isOpen = ref(false)
const selectedIndex = ref(-1)
const buttonRef = ref<HTMLButtonElement | null>(null)
const dropdownMenuRef = ref<HTMLDivElement | null>(null)
const isMenuBottom = ref(true)

const selectedOption = computed(() => {
    if (selectedIndex.value === -1) {
        return props.options[0]
    }
    return props.options[selectedIndex.value]
})

const labelId = `dropdown-label-${Math.random().toString(36).substring(2, 9)}`

async function toggleMenu() {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
        await nextTick()
        const buttonRect = buttonRef.value?.getBoundingClientRect() ?? { bottom: 0 }
        const menuHeight = dropdownMenuRef.value?.offsetHeight ?? 200
        isMenuBottom.value = window.innerHeight - buttonRect?.bottom > menuHeight
    }
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
    <div class="table__dropdown-wrapper">
        <button
            type="button"
            class="table__dropdown-trigger"
            @click="toggleMenu"
            :aria-expanded="isOpen"
            :aria-haspopup="true"
            ref="buttonRef"
        >
            <span>{{ selectedOption.label }}</span>
            <ChevronDownIcon />
        </button>
        <div class="table__dropdown-overlay" v-if="isOpen" @click="toggleMenu"></div>
        <div
            v-show="isOpen"
            class="table__dropdown-menu"
            :class="{ 'table__dropdown-menu--top': !isMenuBottom }"
            role="menu"
            aria-orientation="vertical"
            :aria-labelledby="labelId"
            ref="dropdownMenuRef"
        >
            <div class="py-1" role="none">
                <button
                    v-for="(option, index) in options"
                    :key="index"
                    :class="{
                        'table__dropdown-menu-item--selected ': index === selectedIndex,
                    }"
                    class="table__dropdown-menu-item"
                    role="menuitem"
                    @click="selectOption(index)"
                >
                    {{ option.label }}
                </button>
            </div>
        </div>
    </div>
</template>
<span class="iconify" data-icon="solar:alt-arrow-down-linear" data-inline="false"></span>
