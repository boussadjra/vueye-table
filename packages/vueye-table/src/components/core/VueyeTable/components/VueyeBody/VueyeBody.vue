<script setup lang="ts">
import { BodyProps, bodyPropDefaults } from './api'

const props = withDefaults(defineProps<BodyProps>(), bodyPropDefaults)

const rowKeys = computed(() => {
    return Object.keys(props.bodyRows[0])
})

const rowKeyLeaves = computed(() => {
    console.log('computed rowKeyLeaves')
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
            <template v-for="row in bodyRows" :key="row[itemValue]">
                <slot name="row" :row="row">
                    <tr>
                        <template v-for="key in rowKeys" :key="`${row[itemValue]}.${key}`">
                            <slot :name="`itemCell.${rowKeyLeaves[key]}`" :itemCell="row">
                                <td>
                                    <slot :name="`itemCellContent.${rowKeyLeaves[key]}`" :itemCellContent="row">
                                        {{ row[key] }}
                                    </slot>
                                </td>
                            </slot>
                        </template>
                    </tr>
                </slot>
            </template>
        </template>
    </tbody>
</template>

<style scoped>
.table_loader {
    @apply mx-auto animate-spin ease-linear rounded-full border-8 border-t-8 border-t-primary-300 dark:border-t-primary-800 dark:border-primary-600 border-primary-200 h-16 w-16;
}
</style>
