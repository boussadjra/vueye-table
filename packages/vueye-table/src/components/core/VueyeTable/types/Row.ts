import { FlattenKeys } from './Utils'

export type Row = {
    [key: string]: any
}

export type SlotRowItem<T> = {
    [K in `itemCell.${FlattenKeys<T>}`]: (props: { itemCell: T }) => any
}

export type SlotRowItemContent<T> = {
    [K in `itemCellContent.${FlattenKeys<T>}`]: (props: { itemCellContent: T }) => any
}

export type SlotRow<T extends Record<string, any> = Record<string, string>> = SlotRowItem<T> &
    SlotRowItemContent<T> & {
        body: (props: { rows: T[] }) => any
        rows: (props: { rows: T[] }) => any
        row: (props: { row: T }) => any
        checkbox: (props: { row: T }) => any
    }
