import { InferDefaults } from './types'

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

export const VueyeTablePropsDefaults: InferDefaults<VueyeTableProps> = {
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
