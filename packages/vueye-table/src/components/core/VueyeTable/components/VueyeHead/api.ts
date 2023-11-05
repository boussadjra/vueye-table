import { ColumnHeader, InferDefaults } from '../../types'
type SelectState = 'all' | 'indeterminate' | 'none'
export type HeadProps = {
    columnHeaders: ColumnHeader[][]
    selectable?: boolean
    select?: SelectState
}

export const headPropDefaults: InferDefaults<HeadProps> = {
    columnHeaders: () => [],
    selectable: false,
    select: 'none',
}

export type HeadEmits = {
    (event: 'update:select', value: SelectState): void
}
