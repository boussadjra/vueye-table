import { ColumnHeader, Row } from '../types'

import { getHeaderKeys } from './header'

const getObjectValueByPath = (obj: any, path: string) => {
    const paths = path.split('.')
    let current = obj
    for (let i = 0; i < paths.length; i++) {
        if (current[paths[i]]) {
            current = current[paths[i]]
        } else {
            return undefined
        }
    }
    return current
}

export function getBodyRows(rows: Row[], headers: ColumnHeader[], start = 0, end = rows.length) {
    return rows
        .map((row) => {
            return getHeaderKeys(headers)
                .map((key) => {
                    return {
                        [key]: getObjectValueByPath(row, key),
                    }
                })
                .reduce((acc, cur) => {
                    return { ...acc, ...cur }
                }, {})
        })
        .slice(start, end)
}
