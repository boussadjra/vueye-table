<script setup lang="ts">
import type { ColumnHeader, SlotHeader } from '../../types'

withDefaults(
    defineProps<{
        columnHeaders: ColumnHeader[][]
    }>(),
    {
        columnHeaders: () => [],
    }
)

defineSlots<SlotHeader<Record<string, string>>>()
</script>
<template>
    <thead>
        <tr v-for="(row, index) in columnHeaders" :key="index">
            <template v-for="columnHeader in row" :key="columnHeader.key">
                <slot :name="`headerCell.${columnHeader.key}`" :headerItem="columnHeader">
                    <th
                        :colspan="columnHeader.colSpan"
                        :rowspan="columnHeader.rowSpan"
                        :scope="columnHeader.scope"
                        class="th"
                        :class="columnHeader.className"
                    >
                        <slot :name="`headerCellContent.${columnHeader.key}`" :headerItem="columnHeader">
                            <span :class="columnHeader.labelClassName">
                                {{ columnHeader.label }}
                            </span>
                        </slot>
                    </th>
                </slot>
            </template>
        </tr>
    </thead>
</template>

<style scoped></style>
