<script setup lang="ts">
import type { ColumnHeader, SlotHeader } from '../../types'
import { type HeadProps, headPropDefaults, HeadEmits } from './api'
import VueyeCheckbox from '../utils/VueyeCheckbox.vue'

import ArrowUpDownIcon from '../icons/ArrowUpDownIcon.vue'

const props = withDefaults(defineProps<HeadProps>(), headPropDefaults)

const emit = defineEmits<HeadEmits>()

defineSlots<SlotHeader<Record<string, string>>>()

const sortKey = ref('')
const sortDesc = ref(false)

const sort = (header: ColumnHeader) => {
    if (header.sortable && header.scope === 'col') {
        if (sortKey.value === header.fullKey) {
            sortDesc.value = !sortDesc.value
        } else {
            sortKey.value = header.fullKey ?? ''
            sortDesc.value = false
        }
        emit('sort', { key: sortKey.value, desc: sortDesc.value })
    }
}

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
</script>
<template>
    <slot name="headers" :headers="columnHeaders">
        <thead class="table__head">
            <tr class="table__row table__row" v-for="(row, index) in headers" :key="index">
                <template v-for="columnHeader in row" :key="columnHeader.key">
                    <slot :name="`headerCell.${columnHeader.key}`" :headerItem="columnHeader">
                        <th
                            :colspan="columnHeader.colSpan"
                            :rowspan="columnHeader.rowSpan"
                            :scope="columnHeader.scope"
                            class="table__cell table__cell--head"
                            :class="columnHeader.className"
                        >
                            <slot v-if="columnHeader.key === 'checkbox' && selectable" name="checkbox">
                                <VueyeCheckbox
                                    :indeterminate="selectAll === 'indeterminate'"
                                    type="checkbox"
                                    :checked="selectAll === 'all'"
                                    @change="onCheckChange"
                                    aria-label="select all rows"
                                    class="table__checkbox"
                                />
                            </slot>
                            <slot v-else :name="`headerCellContent.${columnHeader.key}`" :headerItem="columnHeader">
                                <button
                                    v-if="columnHeader.scope === 'col'"
                                    @click="sort(columnHeader)"
                                    class="table__sort-button"
                                >
                                    <span class="table__label table__label--head" :class="columnHeader.labelClassName">
                                        {{ columnHeader.label }}
                                    </span>
                                    <ArrowUpDownIcon
                                        :class="{ 'table__sort-icon--show': sortKey === columnHeader.key }"
                                        class="table__sort-icon"
                                        :down="sortDesc"
                                    />
                                </button>
                                <span
                                    class="table__label table__label--head"
                                    :class="columnHeader.labelClassName"
                                    v-else
                                >
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
<style>
.table__sort-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    position: relative;
}

.table__sort-icon {
    margin-inline-start: 5px;
    transition: all 0.2s ease;
    transform: scale(1.2);
    visibility: hidden;
}

.table__sort-icon--show {
    visibility: visible;
}

.table__sort-button:hover .table__sort-icon {
    visibility: visible;
}
</style>
