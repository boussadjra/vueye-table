import { depthCount, leafCount, flatHeadersToRows } from '../utils'

import { ColumnHeader } from '../types'

export function useHeaders(columnHeaders: Ref<ColumnHeader[]>) {
    const _columnHeaders = unref(columnHeaders) ?? []
    const headers = computed(() => flatHeadersToRows(_columnHeaders, depthCount(_columnHeaders)))

    return {
        headers,
        headersCount: leafCount(_columnHeaders),
    }
}
