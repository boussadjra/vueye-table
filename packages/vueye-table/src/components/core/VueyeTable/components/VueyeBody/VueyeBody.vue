<script setup lang="ts">
import { Row, SlotRow } from '../../types'
import { nestedObjectTransformer } from '../../utils'
import { BodyProps, bodyPropDefaults } from './api'

const props = withDefaults(defineProps<BodyProps>(), bodyPropDefaults)

const rowKeys = computed(() => {
    return Object.keys(props.bodyRows[0])
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

defineSlots<
    SlotRow<Record<string, string>> & {
        row: (row: Record<string, any>) => any
        rows: (props: Record<string, any>[]) => any
        itemCell: (itemCell: Record<string, string>) => any
        itemCellContent: (itemCellContent: Record<string, string>) => any
        loading: () => any
        empty: () => any
    }
>()
</script>
<template>
    <tbody>
        <tr v-if="loading">
            <td :colspan="columnsLength">
                <slot name="loading">
                    <div class="table_loader"></div>
                </slot>
            </td>
        </tr>
        <template v-else-if="bodyRows.length === 0">
            <tr>
                <td :colspan="columnsLength">
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
                        <tr>
                            <template v-for="key in rowKeys" :key="`${row[itemValue]}.${key}`">
                                <slot :name="`itemCell.${key}`" :itemCell="row.nest">
                                    <td>
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
</template>

<style scoped>
.table_loader {
    @apply mx-auto animate-spin ease-linear rounded-full border-8 border-t-8 border-t-primary-300 dark:border-t-primary-800 dark:border-primary-600 border-primary-200 h-16 w-16;
}
</style>
