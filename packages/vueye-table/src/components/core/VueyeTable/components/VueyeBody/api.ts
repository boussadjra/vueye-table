import { InferDefaults, Row } from '../../types'

export type BodyProps = {
    loading: boolean
    bodyRows: Row[]
    itemValue: string
}

export const bodyPropDefaults: InferDefaults<BodyProps> = {
    loading: false,
    bodyRows: () => [],
    itemValue: 'id',
}
