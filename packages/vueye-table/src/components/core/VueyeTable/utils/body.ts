import type { FlattenObject, NativeType } from '../types'

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

export function getBodyRows<TData>(rows: TData[], headerKeys: string[]) {
    return rows.map((row) => {
        const mappedHeaderKeys = headerKeys.map((key) => {
            return {
                [key]: getObjectValueByPath(row, key),
                // ...row,
            }
        })
        const reducedHeaderKeys = mappedHeaderKeys.reduce((acc, cur) => {
            return { ...acc, ...cur }
        }, {})

        return reducedHeaderKeys
    }) as FlattenObject<TData>[]
}

export function paginateRows<TData>(rows: TData[], start = 0, end = rows.length) {
    return rows.slice(start, end)
}

export function nestedObjectTransformer(obj: object) {
    const result: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
        if (key.includes('.')) {
            const [prefix, suffix] = key.split('.')
            if (!result[prefix]) {
                result[prefix] = {}
            }
            result[prefix][suffix] = value
        } else {
            result[key] = value
        }
    }
    for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'object') {
            result[key] = nestedObjectTransformer(value)
        }
    }
    return result
}

export function deepValues(obj: any): any[] {
    const values: any[] = []
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            values.push(...deepValues(obj[key]))
        } else {
            values.push(obj[key])
        }
    }
    return values
}

export function isPrimitive(value: NativeType) {
    return typeof value !== 'function' || typeof value !== 'object'
}
