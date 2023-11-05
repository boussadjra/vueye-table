<script setup lang="ts">
import type { SlotHeader } from '../../types'
import { type HeadProps, headPropDefaults, HeadEmits } from './api'

const props = withDefaults(defineProps<HeadProps>(), headPropDefaults)

const headers = computed(() => {
    if (props.selectable)
        return [
            [
                {
                    key: 'checkbox',
                    label: '',
                    className: 'checkbox',
                    colSpan: 1,
                    rowSpan: props.columnHeaders.length,
                    scope: 'col',
                },
                ...props.columnHeaders[0],
            ],
            ...props.columnHeaders.slice(1),
        ]
    return props.columnHeaders
})

const emit = defineEmits<HeadEmits>()
const selectAll = computed({
    get() {
        return props.select
    },
    set(value) {
        emit('update:select', value)
    },
})

const onCheckChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.checked) selectAll.value = 'all'
    else selectAll.value = 'none'
}
defineSlots<SlotHeader<Record<string, string>>>()
</script>
<template>
    <slot name="headers" :headers="columnHeaders">
        <thead>
            <tr v-for="(row, index) in headers" :key="index">
                <template v-for="columnHeader in row" :key="columnHeader.key">
                    <slot :name="`headerCell.${columnHeader.key}`" :headerItem="columnHeader">
                        <th
                            :colspan="columnHeader.colSpan"
                            :rowspan="columnHeader.rowSpan"
                            :scope="columnHeader.scope"
                            class="th"
                            :class="columnHeader.className"
                        >
                            <slot v-if="columnHeader.key === 'checkbox' && selectable" name="checkbox">
                                <input
                                    :indeterminate="selectAll === 'indeterminate'"
                                    type="checkbox"
                                    :checked="selectAll === 'all'"
                                    @change="onCheckChange"
                                    aria-label="select all rows"
                                />
                            </slot>
                            <slot v-else :name="`headerCellContent.${columnHeader.key}`" :headerItem="columnHeader">
                                <span :class="columnHeader.labelClassName">
                                    {{ columnHeader.label }}
                                </span>
                            </slot>
                        </th>
                    </slot>
                </template>
            </tr>
        </thead>
    </slot>
</template>

<style scoped></style>
