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

export type SlotRow<T> = SlotRowItem<T> & SlotRowItemContent<T>
