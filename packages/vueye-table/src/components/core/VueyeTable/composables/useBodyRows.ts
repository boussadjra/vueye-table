import { ColumnHeader, FlattenKeys, FlattenObject } from '../types'

import { MaybeRef } from 'vue'
import { generateColumns, getBodyRows, getHeaderKeys, paginateRows } from '../utils'
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
    const sortKey = ref<keyof FlattenObject<TData>>()
    const sortDesc = ref(false)
    function onSort({ key, desc }: { key: keyof FlattenObject<TData>; desc: boolean }) {
        sortKey.value = key
        sortDesc.value = desc
    }

    const headerKeys = computed(() => {
        const nativeHeaders = generateColumns(toValue(props.data)[0])
        const nativeHeaderKeys = getHeaderKeys(nativeHeaders)
        const headerKeys = getHeaderKeys(toValue(headers))

        const notListedKeys = []
        const allKeys = [...headerKeys]

        for (const key of nativeHeaderKeys) {
            if (!headerKeys.includes(key)) {
                notListedKeys.push(key)
                allKeys.push(key)
            }
        }

        return {
            notListedKeys,
            allKeys,
        }
    })

    const bodyRows = computed(() => {
        const start = toValue(pagination).perPage * (toValue(pagination).currentPage - 1)
        const end = toValue(pagination).perPage * toValue(pagination).currentPage

        const rows = getBodyRows(toValue(props.data), headerKeys.value.allKeys)

        const filterBy = computed(() => {
            if (props.filterBy === undefined || props.filterBy.length === 0) {
                return Object.keys(rows[0]) as FlattenKeys<TData>[]
            }
            return props.filterBy
        })
        const filteredRows = rows.filter((item) => props.filterMethod?.(props.filterQuery, item, toValue(filterBy)))
        // Sort rows if sortKey is not empty
        if (sortKey.value) {
            filteredRows.sort((a, b) => {
                if (!sortKey.value) return 0
                const aValue = a[sortKey.value]
                const bValue = b[sortKey.value]

                if (aValue < bValue) {
                    return sortDesc.value ? 1 : -1
                } else if (aValue > bValue) {
                    return sortDesc.value ? -1 : 1
                } else {
                    return 0
                }
            })
        }

        return paginateRows(filteredRows, start, end)
    })

    return {
        bodyRows,
        notListedKeys: computed(() => headerKeys.value.notListedKeys),
        rowsCount: computed(() => toValue(props.data).length),
        onSort,
    }
}
