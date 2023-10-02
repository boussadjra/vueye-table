import { ColumnHeader } from '../types'
import { humanize } from './humanize'

export function depthCount(headers: ColumnHeader[]) {
    let depth = 1
    headers.forEach((header) => {
        if (header.children) {
            depth = Math.max(depth, depthCount(header.children) + 1)
        }
    })
    return depth
}

export function leafCount(headers: ColumnHeader[]) {
    let count = 0
    headers.forEach((header) => {
        if (header.children) {
            count += leafCount(header.children)
        } else {
            count++
        }
    })
    return count
}

export function flatHeadersToRows(
    headers: ColumnHeader[],
    depth: number,
    rows: ColumnHeader[][] = [],
    currentRow = 0,
    level: number = 0
) {
    headers.forEach((header) => {
        if (!rows[currentRow]) {
            rows[currentRow] = []
        }
        if (header.children) {
            const { children, ...rest } = header
            const colSpan = leafCount(children)

            rows[currentRow].push({
                ...rest,
                colSpan,
                scope: 'colgroup',
            })

            flatHeadersToRows(children, depth, rows, currentRow + 1, level + 1)
        } else {
            const rowSpan = depth - level
            rows[currentRow].push({
                ...header,
                key: header.key,
                label: header.label,
                rowSpan,
                scope: 'col',
            })
        }
    })
    return rows
}

export function getHeaderKeys<T extends ColumnHeader>(headers: T[], keysPath: string = '', keys: string[] = []) {
    headers.forEach((header) => {
        if (header.children) {
            getHeaderKeys(header.children, `${keysPath}${header.key}.`, keys)
        } else {
            keys.push(`${keysPath}${header.key}`)
        }
    })
    return keys
}

export function defineColumnHeaders(headers: any[]) {
    const depth = depthCount(headers)
    const rows = flatHeadersToRows(headers, depth)
    const columnHeaders = rows.reduce((acc, row) => [...acc, ...row], [])
    return columnHeaders
}

export function generateColumns<T>(dataItem: T): ColumnHeader[] {
    const columns: ColumnHeader[] = []

    for (const key in dataItem) {
        const label = humanize(key)
        const column: ColumnHeader = {
            key,
            label,
        }

        if (typeof dataItem[key] === 'object' && dataItem[key] !== null) {
            const children = generateColumns(dataItem[key])
            if (children.length > 0) {
                column.children = children
            }
        }

        columns.push(column)
    }

    return columns
}
