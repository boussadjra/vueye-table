<script setup lang="ts">
import CodeGroupTabsHeader from './CodeGroupTabsHeader.vue'

const isTag = (slot: any, tag: string) => {
    return slot.type && slot.type.tag && slot.type.tag === tag
}

const isCodeTag = (slot: any) => {
    return isTag(slot, 'code-block') || isTag(slot, 'code') || isTag(slot, 'pre')
}

const activeTabIndex = ref(0)
const _slots = useSlots()?.default?.() || []

const tabs = _slots
    .filter((slot) => isCodeTag(slot))
    .map((slot, index) => {
        return {
            label: slot?.props?.filename || slot?.props?.label || `${index}`,
            language: slot?.props?.language || null,
            active: slot?.props?.active || false,
            component: slot,
        }
    })

const onChangeActiveTab = (index: number) => {
    activeTabIndex.value = index
}

const render = () =>
    h(
        'div',
        {
            class: {
                'code-group': true,
                'first-tab': activeTabIndex.value === 0,
            },
        },
        [
            h(CodeGroupTabsHeader, {
                ref: 'tabs-header',
                activeTabIndex: activeTabIndex.value,
                tabs,
                'onUpdate:activeTabIndex': onChangeActiveTab,
            }),
            h(
                'div',
                {
                    class: 'code-group-content',
                    text: activeTabIndex.value,
                },
                // Map slots to content children
                _slots.map((slot, index) => {
                    if (slot.props && isCodeTag(slot)) {
                        slot.props.hideFilename = true
                    }
                    return h(
                        'div',
                        {
                            // Current slot is displayed, others are hidden
                            style: {
                                display: index === activeTabIndex.value ? 'block' : 'none',
                            },
                            class: {
                                '': !isCodeTag(slot),
                            },
                        },
                        // Display direct children if not a ```code``` block
                        [
                            isCodeTag(slot)
                                ? slot
                                : h(
                                      'div',
                                      {
                                          class: {
                                              'preview-canvas': true,
                                          },
                                      },
                                      [(slot.children as any)?.default?.() || h('div')]
                                  ),
                        ]
                    )
                })
            ),
        ]
    )
</script>

<template>
    <render />
</template>

<style>
.container {
    @apply !rounded-t-none !my-0;
}
pre {
    @apply !mt-0  !rounded-t-none;
}
</style>
