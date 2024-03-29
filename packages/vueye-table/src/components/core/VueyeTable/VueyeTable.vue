<script
    setup
    lang="ts"
    generic="
        TData extends Record<string, unknown> = Record<string, unknown>,
        TColumn extends ColumnHeader<TData> = ColumnHeader<TData>
    "
>
import { VueyeTableProps, VueyeTableSlots, VueyeTableEmits, getVueyeTablePropDefaults } from './api'
import { VueyeBody, VueyeHead, VueyePagination } from './components'
import { useBodyRows, useHeaders, usePagination } from './composables'
import type { ColumnHeader } from './types'
import { generateColumns } from './utils'
import { useSelection } from './composables'
defineOptions({
    inheritAttrs: false,
})

const props = withDefaults(defineProps<VueyeTableProps<TData, TColumn>>(), getVueyeTablePropDefaults<TData, TColumn>())

const emit = defineEmits<VueyeTableEmits<TData>>()

const _columnHeaders = computed(() =>
    props.columnHeaders.length === 0 ? generateColumns(props.data[0]) : props.columnHeaders
)

const { headers, headersCount } = useHeaders(_columnHeaders)
const slots = defineSlots<VueyeTableSlots<TData>>()

const headerSlots = Object.keys(slots).filter((slot) => slot.startsWith('headerCell'))

const rowItemSlots = Object.keys(slots).filter((slot) => slot.startsWith('itemCell'))

const { pagination, updateCurrentPage, updatePerPage } = usePagination(props, emit)

const { bodyRows, rowsCount, notListedKeys, onSort } = useBodyRows(props, _columnHeaders, pagination)

const { selected: _selected, selectAll } = useSelection(props, bodyRows, emit)
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
            <VueyeHead
                :columnHeaders="headers"
                :selectable="selected !== null"
                v-model:select="selectAll"
                @sort="onSort"
            >
                <template #headers="scope">
                    <slot name="headers" v-bind="scope" />
                </template>
                <template v-for="slotName in headerSlots" v-slot:[slotName]="scope">
                    <!-- @vue-ignore -->
                    <slot :name="slotName" v-bind="scope" />
                </template>
            </VueyeHead>
            <VueyeBody
                v-model:selected="_selected"
                :bodyRows="bodyRows"
                :loading="loading"
                :itemValue="itemValue"
                :columns-length="headersCount"
                :not-listed-keys="notListedKeys"
            >
                <template #checkbox="scope">
                    <slot name="checkbox" v-bind="scope" />
                </template>
                <template #loading>
                    <slot name="loading" />
                </template>
                <template #empty>
                    <slot name="empty" />
                </template>
                <template #rows="scope">
                    <!-- @vue-ignore -->
                    <slot name="rows" v-bind="scope" />
                </template>
                <template #row="scope">
                    <!-- @vue-ignore -->
                    <slot name="row" v-bind="scope" />
                </template>

                <template v-for="slotName in rowItemSlots" v-slot:[slotName]="scope">
                    <!-- @vue-ignore -->
                    <slot :name="slotName" v-bind="scope" />
                </template>
            </VueyeBody>
            <slot name="summary">
                <caption class="table__summary">
                    {{
                        summary
                    }}
                </caption>
            </slot>
        </table>
        <slot name="pagination" :pagination="{ ...pagination, perPageOptions, total: rowsCount }">
            <VueyePagination
                :perPage="pagination.perPage"
                :currentPage="pagination.currentPage"
                :perPageOptions="perPageOptions"
                :total="rowsCount"
                @update:current-page="updateCurrentPage"
                @update:per-page="updatePerPage"
                class="table__pagination"
                v-show="data.length > 0"
            />
        </slot>
    </div>
</template>
<style src="./styles/default.css"></style>
