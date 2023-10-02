<script setup lang="ts" generic="TData extends Record<string, unknown>, TColumn extends ColumnHeader">
import { VueyeTableProps, VueyeTablePropsDefaults } from './api'
import { VueyeBody, VueyeHead, VueyePagination } from './components'
import { useBodyRows, useHeaders, usePagination } from './composables'
import type { ColumnHeader, SlotHeader } from './types'
import { generateColumns } from './utils'

defineOptions({
    inheritAttrs: false,
})

const props = withDefaults(defineProps<VueyeTableProps<TColumn, TData>>(), VueyeTablePropsDefaults)

const _columnHeaders = computed(() =>
    props.columnHeaders.length === 0 ? generateColumns(props.data[0]) : props.columnHeaders
)

const { headers } = useHeaders(_columnHeaders)
const slots = defineSlots<
    SlotHeader<TData> & {
        caption: () => any
        summary: () => any
    }
>()

const headerSlots = Object.keys(slots).filter((slot) => slot.startsWith('headerCell'))

const { pagination, updateCurrentPage, updatePerPage } = usePagination(props)

const { bodyRows } = useBodyRows(props.data, _columnHeaders, pagination)
</script>
<template>
    <div class="table__wrapper">
        <table :class="$attrs.class ?? 'table'">
            <slot name="caption">
                <caption v-if="caption" class="table__caption">
                    {{
                        caption
                    }}
                </caption>
            </slot>
            <VueyeHead :columnHeaders="headers">
                <template v-for="slotName in headerSlots" v-slot:[slotName]="scope">
                    <!-- @vue-ignore -->
                    <slot :name="slotName" v-bind="scope" />
                </template>
            </VueyeHead>
            <VueyeBody :bodyRows="bodyRows" :loading="loading" />
            <slot name="summary">
                <caption class="table__summary">
                    {{
                        summary
                    }}
                </caption>
            </slot>
        </table>
        <div class="table__pagination-wrapper">
            <VueyePagination
                :perPage="pagination.perPage"
                :currentPage="pagination.currentPage"
                :perPageOptions="perPageOptions"
                :total="data.length"
                @update:current-page="updateCurrentPage"
                @update:per-page="updatePerPage"
            />
        </div>
    </div>
</template>

<style src="./styles/index.css"></style>
<style>
.table__wrapper {
    @apply flex flex-col w-max;
}

.table__pagination-wrapper {
    @apply py-4 flex justify-end;
}
</style>
