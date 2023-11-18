import { ColumnHeader } from '../types'

import { MaybeRef } from 'vue'
import { getBodyRows, paginateRows } from '../utils'
import { VueyeTableProps } from '../api'

interface PaginationProps {
    perPage: number
    currentPage: number
}

export function useBodyRows<TData extends Record<string, unknown>, TColumn extends ColumnHeader<TData>>(
    props: VueyeTableProps<TData, TColumn>,

    headers: MaybeRef<ColumnHeader[]>,
    pagination: MaybeRef<PaginationProps>
) {
    const bodyRows = computed(() => {
        const start = toValue(pagination).perPage * (toValue(pagination).currentPage - 1)
        const end = toValue(pagination).perPage * toValue(pagination).currentPage

        const rows = getBodyRows(toValue(props.data), toValue(headers))
        const filteredRows = rows.filter((item) => props.filterMethod?.(props.filterQuery, item, props.filterBy))
        return paginateRows(filteredRows, start, end)
    })

    return {
        bodyRows,
        rowsCount: computed(() => toValue(props.data).length),
    }
}
