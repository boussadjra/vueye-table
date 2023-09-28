import { ColumnHeader } from '../types'
import { getHeaderKeys } from '../utils'

export function useHeaderKeys(columnHeaders: ColumnHeader[][]) {
    const headerKeys = computed(() => {
        return getHeaderKeys(columnHeaders.flat())
    })

    return {
        headerKeys,
    }
}
