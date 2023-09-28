<script setup lang="ts" generic="TData extends Record<string, unknown>, TColumn extends ColumnHeader">
import VueyePagination from './VueyePagination/VueyePagination.vue'
import { useBodyRows } from './composables/useBodyRows'
import { useHeaders } from './composables/useHeaders'
import { ColumnHeader, SlotHeader } from './types'
import { VueyeBody } from './VueyeBody'
import { VueyeHead } from './VueyeHead'

const props = withDefaults(
    defineProps<{
        itemValue?: string
        columnHeaders: TColumn[]
        data: TData[]

        perPage?: number
        currentPage?: number
        perPageOptions?: number[]

        loading?: boolean
        selectable?: boolean

        caption?: string
        summary?: string
    }>(),
    {
        itemValue: 'id',
        columnHeaders: () => [],
        data: () => [],

        perPage: 10,
        currentPage: 1,
        perPageOptions: () => [5, 10, 20, 30],

        loading: false,
        selectable: false,

        caption: '',
        summary: '',
    },
)

const _columnHeaders = toRef(props, 'columnHeaders') as Ref<ColumnHeader[]>
const pagination = ref({
    perPage: props.perPage || 10,
    currentPage: props.currentPage || 1,
})
console.log(props)
const { headers } = useHeaders(_columnHeaders)
const { bodyRows } = useBodyRows(props.data, _columnHeaders, pagination)

const slots = defineSlots<
    SlotHeader<TData> & {
        caption: () => any
        summary: () => any
    }
>()

const headerSlots = Object.keys(slots).filter((slot) => slot.startsWith('headerCell'))

function updateCurrentPage(page: number) {
    pagination.value.currentPage = page
}

function updatePerPage(perPage: number) {
    pagination.value.perPage = perPage
}
defineOptions({
    inheritAttrs: false,
})
</script>
<template>
    <div class="table__wrapper">
        <table :class="$attrs.class ?? 'table'">
            <slot name="caption">
                <caption class="table__caption">
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
