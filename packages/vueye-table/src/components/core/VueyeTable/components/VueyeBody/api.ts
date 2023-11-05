import { InferDefaults, Row } from '../../types'

export type BodyProps = {
    loading: boolean
    bodyRows: Row[]
    itemValue: string
    columnsLength: number
    selected: Row[] | null
}

export const bodyPropDefaults: InferDefaults<BodyProps> = {
    loading: false,
    bodyRows: () => [],
    itemValue: 'id',
    columnsLength: 0,
}

export type BodyEmits = {
    (event: 'update:selected', value: Row[]): void
}
