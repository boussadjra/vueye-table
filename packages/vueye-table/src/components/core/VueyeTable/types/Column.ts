import { DeepKeys } from './Utils'

export type SortOrder = 'ascending' | 'descending' | null

export type FiltrableColumnHeaderBase = {
    filterable?: boolean
    filter?: (value: any, filter: any) => boolean
}

export type FiltrableColumnHeader = FiltrableColumnHeaderBase & {
    filterOptions?: any[]
    filterMultiple?: boolean
    filterMethod?: (value: any, filter: any) => boolean
    filterRemote?: boolean
    filterRemoteMethod?: (prop: string, filters: any[]) => Promise<any>
}

export type SortableColumnHeaderBase = {
    sortable?: boolean
    sortMethod?: (a: any, b: any) => number
    sortBy?: (row: any) => any
}

export type SortableColumnHeader = SortableColumnHeaderBase & {
    sortOrders?: SortOrder[]
    sortRemote?: boolean
    sortRemoteMethod?: (prop: string, order: SortOrder) => Promise<any>
    defaultSortOrder?: SortOrder
}

export type ColumnHeaderBase<TData extends Record<string, unknown>> = FiltrableColumnHeaderBase &
    SortableColumnHeaderBase & {
        key: string
        label: string
        children?: ColumnHeaderBase<TData>[]

        align?: 'left' | 'center' | 'right'
        fixed?: 'left' | 'right'

        formatter?: (value: any, row: any, index: number) => string
        className?: string
        labelClassName?: string

        selectable?: (row: any, index: number) => boolean
        resizable?: boolean

        showOverflowTooltip?: boolean
    }

export type ColumnHeader = ColumnHeaderBase<Record<string, never>> & {
    rowSpan?: number
    colSpan?: number

    width?: string
    minWidth?: string

    scope?: string
}

export function defineTableColumnHeaders<TData extends Record<string, unknown>>(
    columnHeaders: ColumnHeaderBase<TData>[]
): ColumnHeader[] {
    const headers: ColumnHeader[] = []

    for (const header of columnHeaders) {
        const children = header.children ? defineTableColumnHeaders(header.children) : undefined

        headers.push({
            ...header,
            children,
        })
    }

    return headers
}

type SlotGenerator<T, Prefix extends string> = {
    [K in DeepKeys<T> as K extends string ? `${Prefix}.${K}` : never]: (props: { headerItem: ColumnHeader }) => any
}

export type SlotHeaderCell<T> = SlotGenerator<T, 'headerCell'>
export type SlotHeaderCellContent<T> = SlotGenerator<T, 'headerCellContent'>

export type SlotHeader<T> = SlotHeaderCell<T> &
    SlotHeaderCellContent<T> & {
        headers: (props: { headers: ColumnHeader[][] }) => any
    }
