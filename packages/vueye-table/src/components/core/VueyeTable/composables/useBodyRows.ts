import { ColumnHeader, Row } from '../types'

import { getBodyRows } from '../utils'

interface PaginationProps {
    perPage: number
    currentPage: number
}

export function useBodyRows(rows: Row[], headers: Ref<ColumnHeader[]>, pagination: Ref<PaginationProps>) {
    const bodyRows = computed(() => {
        const start = pagination.value.perPage * (pagination.value.currentPage - 1)
        const end = pagination.value.perPage * pagination.value.currentPage

        return getBodyRows(rows, unref(headers), start, end)
    })
    return {
        bodyRows,
    }
}
