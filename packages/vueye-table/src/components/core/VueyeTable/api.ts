import { PaginationEmits, PaginationProps } from './components/VueyePagination/api'
import { InferDefaults, Row, SlotHeader, SlotRow, FlattenKeys, ColumnHeader, FlattenObject, NativeType } from './types'
import { deepValues, isPrimitive } from './utils'
export type FilterMethod<TData extends Record<string, unknown>> = (
    query: string | undefined,
    item: FlattenObject<TData>,
    filterBy?: FlattenKeys<TData>[]
) => boolean | undefined
export type VueyeTableProps<
    TData extends Record<string, unknown> = Record<string, unknown>,
    TColumn extends ColumnHeader<TData> = ColumnHeader<TData>,
> = {
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

    filterQuery?: string
    filterBy?: FlattenKeys<TData>[]
    filterMethod?: FilterMethod<TData>
}

export function getVueyeTablePropDefaults<
    TData extends Record<string, unknown>,
    TColumn extends ColumnHeader<TData>,
>(): InferDefaults<VueyeTableProps<TData, TColumn>> {
    return {
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

        filterQuery: '',
        filterBy: undefined,
        filterMethod: (query, item, filterBy) => {
            if (query === '' || query === undefined || filterBy === undefined || filterBy.length === 0) return true
            const found = filterBy?.some((key) => {
                const value = item[key] as NativeType

                if (isPrimitive(value)) return value?.toString().toLowerCase().includes(query.toLowerCase())
                else return false
            })

            return found
        },
    }
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
