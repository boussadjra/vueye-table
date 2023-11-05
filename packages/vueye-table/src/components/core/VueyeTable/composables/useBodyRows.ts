import { ColumnHeader, Row } from '../types'

import { MaybeRef } from 'vue'
import { getBodyRows } from '../utils'
import { VueyeTableProps } from '../api'

interface PaginationProps {
    perPage: number
    currentPage: number
}

export function useBodyRows(
    props: VueyeTableProps,

    headers: MaybeRef<ColumnHeader[]>,
    pagination: MaybeRef<PaginationProps>
) {
    const rows = computed(() => {
        if (props.filterQuery) {
            return props.data.filter((item) => props.filterMethod?.(props.filterQuery, item))
        } else {
            return props.data
        }
    })
    const bodyRows = computed(() => {
        const start = toValue(pagination).perPage * (toValue(pagination).currentPage - 1)
        const end = toValue(pagination).perPage * toValue(pagination).currentPage

        return getBodyRows(toValue(rows), toValue(headers), start, end)
    })

    return {
        bodyRows,
    }
}
