import { InferDefaults } from '../../types'

export interface PaginationProps {
    perPage: number
    currentPage: number
    total: number
    perPageOptions: number[]
}

export interface PaginationEmits {
    (event: 'update:currentPage', value: number): void
    (event: 'update:perPage', value: number): void
}

export const paginationPropsDefaults: InferDefaults<PaginationProps> = {
    perPage: 10,
    currentPage: 1,
    total: 0,
    perPageOptions: () => [10, 20, 30, 40, 50],
}
