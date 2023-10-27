import { InferDefaults, SlotHeader, SlotRow } from './types'

export type VueyeTableProps<TColumn = any, TData = any> = {
    data: TData[]
    columnHeaders?: TColumn[]
    itemValue?: string

    perPage?: number
    currentPage?: number
    perPageOptions?: number[]

    loading?: boolean
    selectable?: boolean

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
    selectable: false,

    caption: '',
    summary: '',
}

export type VueyeTableEmits = {
    (event: 'update:currentPage', value: number): void
    (event: 'update:perPage', value: number): void
    (event: 'update:perPageOptions', value: number[]): void
    (event: 'update:loading', value: boolean): void
    (event: 'update:selectable', value: boolean): void
}

export type VueyeTableSlots<TData> = SlotHeader<TData> &
    SlotRow<TData> & {
        caption: () => any
        summary: () => any
        loading: () => any
        empty: () => any
    }
