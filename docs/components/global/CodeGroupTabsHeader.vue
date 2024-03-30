<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

interface Props {
    tabs: Array<{ label: string; component: any }>
    activeTabIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits(['update:activeTabIndex'])

const tabsRef = ref<HTMLElement>()
const highlightUnderline = ref()

const updateHighlightUnderlinePosition = (activeTab?: HTMLElement) => {
    if (!activeTab) {
        return
    }

    highlightUnderline.value.style.left = `${activeTab.offsetLeft}px`
    highlightUnderline.value.style.width = `${activeTab.clientWidth}px`
}

const updateTabs = ($event: Event, index: number) => {
    emit('update:activeTabIndex', index)
    nextTick(() => updateHighlightUnderlinePosition($event.target as HTMLElement))
}

watch(
    tabsRef,
    (newVal) => {
        if (!newVal) {
            return
        }

        setTimeout(() => {
            updateHighlightUnderlinePosition(tabsRef.value?.children[props.activeTabIndex] as HTMLElement | undefined)
        }, 50)
    },
    {
        immediate: true,
    }
)
</script>

<template>
    <div class="relative dark:bg-vprimary-900 bg-vprimary-100 rounded-t">
        <div v-if="tabs" ref="tabsRef" class="relative z-0 px-2 flex">
            <button
                v-for="({ label, component }, i) in tabs"
                :key="`${i}${label}`"
                :class="[activeTabIndex === i ? ' border-vsecondary-500' : 'border-transparent']"
                class="relative select-none px-4 border-t-4 py-2.5 flex gap-1.5 px-1 justify-center items-center text-sm leading-5 tracking-tight transition-colors duration-100"
                @click="updateTabs($event, i)"
            >
                <span :class="component.props.meta" class="text-xl"> </span>
                <span>
                    {{ label }}
                </span>
            </button>
            <!-- <span ref="highlightUnderline" class="highlight-underline -z-1 absolute top-0 h-1">
                <span class="flex h-full w-full bg-vsecondary-500" />
            </span> -->
        </div>

        <slot name="footer" />
    </div>
</template>
