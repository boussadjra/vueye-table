import { PaginationEmits, PaginationProps } from './components/VueyePagination/api'
import { InferDefaults, Row, SlotHeader, SlotRow } from './types'

export type VueyeTableProps<TColumn = any, TData = any> = {
    data: TData[]
    columnHeaders?: TColumn[]
    itemValue?: string

    perPage?: number
    currentPage?: number
    perPageOptions?: number[]

    loading?: boolean
    selected?: TData[] | Row[] | null
    selectMode?: 'page' | 'all'
    caption?: string
    summary?: string
}

export const vueyeTablePropDefaults: InferDefaults<VueyeTableProps> = {
    itemValue: 'id',
    columnHeaders: () => [],
    data: () => [],

    perPage: 10,
    currentPage: 1,
    perPageOptions: () => [5, 10, 20, 30],

    loading: false,
    selected: null,
    selectMode: 'all',

    caption: '',
    summary: '',
}

export type VueyeTableEmits<T> = PaginationEmits & {
    (event: 'update:loading', value: boolean): void
    (event: 'update:selected', value: T[]): void
}

export type VueyeTableSlots<TData extends Record<string, any>> = SlotHeader<TData> &
    SlotRow<TData> & {
        caption: () => any
        summary: () => any
        loading: () => any
        empty: () => any
        pagination: (props: { pagination: PaginationProps }) => any
    }
