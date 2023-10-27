import { DeepKeys } from './Utils'

export type Row = {
    [key: string]: any
}

export type SlotRowItem<T> = {
    [K in DeepKeys<T> as K extends string ? `itemCell.${K}` : never]: (props: { itemCell: Row }) => any
}

export type SlotRowItemContent<T> = {
    [K in DeepKeys<T> as K extends string ? `itemCellContent.${K}` : never]: (props: { itemCellContent: Row }) => any
}

export type SlotRow<T> = SlotRowItem<T> & SlotRowItemContent<T>
