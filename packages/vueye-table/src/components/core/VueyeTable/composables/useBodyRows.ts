import { ColumnHeader, Row } from '../types'

import { MaybeRef } from 'vue'
import { getBodyRows } from '../utils'

interface PaginationProps {
    perPage: number
    currentPage: number
}

export function useBodyRows(
    rows: MaybeRef<Row[]>,
    headers: MaybeRef<ColumnHeader[]>,
    pagination: MaybeRef<PaginationProps>
) {
    const bodyRows = computed(() => {
        const start = toValue(pagination).perPage * (toValue(pagination).currentPage - 1)
        const end = toValue(pagination).perPage * toValue(pagination).currentPage

        return getBodyRows(toValue(rows), toValue(headers), start, end)
    })

    return {
        bodyRows,
    }
}
