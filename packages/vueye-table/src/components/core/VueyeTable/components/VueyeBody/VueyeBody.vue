<script setup lang="ts">
import { Row, SlotRow } from '../../types'
import { nestedObjectTransformer } from '../../utils'
import { BodyProps, bodyPropDefaults, BodyEmits } from './api'
import VueyeCheckbox from '../utils/VueyeCheckbox.vue'

const props = withDefaults(defineProps<BodyProps>(), bodyPropDefaults)

const emit = defineEmits<BodyEmits>()

defineSlots<
    SlotRow & {
        loading: () => any
        empty: () => any
    }
>()

const rowKeys = computed(() => {
    return Object.keys(props.bodyRows[0]).filter((key) => !props.notListedKeys.includes(key))
})

const rowKeyLeaves = computed(() => {
    return rowKeys.value.reduce(
        (acc, key) => {
            return {
                ...acc,
                [key]: key.split('.').pop() ?? '',
            }
        },
        {} as Record<string, string>
    )
})

const rows = computed(() => {
    return props.bodyRows.map((row) => {
        return {
            flat: row,
            nest: nestedObjectTransformer(row) as Row,
        }
    })
})

const nestRows = computed(() => {
    return rows.value.map((row) => row.nest)
})

const _selected = computed({
    get() {
        return props.selected as Row[]
    },
    set(value: Row[]) {
        emit('update:selected', value)
    },
})
</script>
<template>
    <slot name="body" :rows="bodyRows">
        <tbody class="table__body">
            <tr v-if="loading" class="table__row table__row--loading">
                <td :colspan="columnsLength" class="table__cell table__cell--loading">
                    <slot name="loading"> Loading... </slot>
                </td>
            </tr>
            <template v-else-if="bodyRows.length === 0">
                <tr class="table__row table__row--empty">
                    <td class="table__cell" :colspan="columnsLength">
                        <slot name="empty">
                            <div class="text-center">No data available</div>
                        </slot>
                    </td>
                </tr>
            </template>
            <template v-else>
                <slot name="rows" :rows="nestRows">
                    <template v-for="row in rows" :key="row[itemValue]">
                        <slot name="row" :row="row.nest">
                            <tr class="table__row">
                                <slot v-if="selected" name="checkbox" :row="row.nest">
                                    <td class="table__cell table_cell--checkbox">
                                        <VueyeCheckbox v-model="_selected" :value="row.nest" aria-label="Select row" />
                                    </td>
                                </slot>
                                <template v-for="key in rowKeys" :key="`${row[itemValue]}.${key}`">
                                    <slot :name="`itemCell.${key}`" :itemCell="row.nest">
                                        <td class="table__cell">
                                            <slot
                                                :name="`itemCellContent.${rowKeyLeaves[key]}`"
                                                :itemCellContent="row.nest"
                                            >
                                                {{ row.flat[key] }}
                                            </slot>
                                        </td>
                                    </slot>
                                </template>
                            </tr>
                        </slot>
                    </template>
                </slot>
            </template>
        </tbody>
    </slot>
</template>
