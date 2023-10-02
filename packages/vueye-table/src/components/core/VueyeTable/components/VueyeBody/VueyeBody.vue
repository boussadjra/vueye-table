<script setup lang="ts">
import { Row } from '../types'
const props = withDefaults(
    defineProps<{
        loading: boolean
        bodyRows: Row[]
        itemValue: string
    }>(),
    {
        loading: false,
        bodyRows: () => [],
        itemValue: 'id',
    }
)

const columnnsLength = computed(() => {
    return Object.keys(props.bodyRows[0]).length
})
</script>
<template>
    <tbody>
        <tr v-if="loading">
            <td :colspan="columnnsLength">
                <div class="flex justify-center items-center">
                    <div
                        class="loader animate-spin ease-linear rounded-full border-8 border-t-8 border-t-primary-300 dark:border-t-primary-800 dark:border-primary-600 border-primary-200 h-16 w-16"
                    ></div>
                </div>
            </td>
        </tr>
        <tr v-else v-for="row in bodyRows" :key="row[itemValue]">
            <slot :row="row">
                <td v-for="key in Object.keys(row)" :key="`${row[itemValue]}.${key}`" :id="`${row[itemValue]}.${key}`">
                    <slot :cell="row[key]" :key="`${row[itemValue]}.${key}`">
                        {{ row[key] }}
                    </slot>
                </td>
            </slot>
        </tr>
    </tbody>
</template>

<style scoped></style>
