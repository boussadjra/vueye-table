import { DeepKeys } from './Utils'

export type ColumnHeader<TData extends Record<string, unknown> = Record<string, unknown>> = {
    key: string
    label: string
    children?: ColumnHeader<TData>[]

    align?: 'left' | 'center' | 'right'
    fixed?: 'left' | 'right'

    className?: string
    labelClassName?: string
    rowSpan?: number
    colSpan?: number

    scope?: string
}

export function defineTableColumnHeaders<TData extends Record<string, unknown>>(
    columnHeaders: ColumnHeader<TData>[]
): ColumnHeader<TData>[] {
    const headers: ColumnHeader<TData>[] = []

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
        checkbox: () => any
    }
