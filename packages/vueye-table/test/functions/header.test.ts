import {
    defineColumnHeaders,
    depthCount,
    flatHeadersToRows,
    generateColumns,
    getHeaderKeys,
    leafCount,
} from '../../src/components/core/VueyeTable/utils/header'
import { describe, expect, it } from 'vitest'

const headers = [
    {
        key: 'product',
        label: 'Product',
    },
    {
        key: 'sales',
        label: 'Sales',
        children: [
            {
                key: '2022',
                label: '2022',
                children: [
                    {
                        key: 'jan',
                        label: 'Jan',
                    },
                    {
                        key: 'feb',
                        label: 'Feb',
                    },
                    {
                        key: 'mar',
                        label: 'Mar',
                    },
                ],
            },
            {
                key: '2023',
                label: '2023',
            },
        ],
    },
]

describe('header', () => {
    it('should return a flat array of headers', () => {
        const expected = [
            [
                {
                    key: 'product',
                    label: 'Product',
                    rowSpan: 3,
                    scope: 'col',
                },
                {
                    key: 'sales',
                    label: 'Sales',
                    colSpan: 4,
                    scope: 'colgroup',
                },
            ],
            [
                {
                    key: '2022',
                    label: '2022',
                    colSpan: 3,
                    scope: 'colgroup',
                },
                {
                    key: '2023',
                    label: '2023',
                    rowSpan: 2,
                    scope: 'col',
                },
            ],
            [
                {
                    key: 'jan',
                    label: 'Jan',
                    rowSpan: 1,
                    scope: 'col',
                },
                {
                    key: 'feb',
                    label: 'Feb',
                    rowSpan: 1,
                    scope: 'col',
                },
                {
                    key: 'mar',
                    label: 'Mar',
                    rowSpan: 1,
                    scope: 'col',
                },
            ],
        ]

        expect(flatHeadersToRows(headers, depthCount(headers))).toEqual(expected)
    })

    it('should return an array of key paths separated by .', () => {
        const expected = ['product', 'sales.2022.jan', 'sales.2022.feb', 'sales.2022.mar', 'sales.2023']
        const actual = getHeaderKeys(headers)
        expect(actual).toEqual(expected)
    })
})

describe('generateColumnHeaders', () => {
    const data = [
        {
            product_name: 'Car',
            sales: {
                '2022': {
                    jan: 1,
                    feb: 2,
                    mar: 3,
                    avr: 7,
                },
                '2023': 4,
            },
        },
    ]

    const expected = [
        {
            key: 'product_name',
            label: 'Product Name',
        },
        {
            key: 'sales',
            label: 'Sales',
            children: [
                {
                    key: '2022',
                    label: '2022',
                    children: [
                        {
                            key: 'jan',
                            label: 'Jan',
                        },
                        {
                            key: 'feb',
                            label: 'Feb',
                        },
                        {
                            key: 'mar',
                            label: 'Mar',
                        },
                        {
                            key: 'avr',
                            label: 'Avr',
                        },
                    ],
                },
                {
                    key: '2023',
                    label: '2023',
                },
            ],
        },
    ]

    it('should generate column headers from data', () => {
        const actual = generateColumns(data[0])
        expect(actual).toEqual(expected)
    })
})

describe('leafCount', () => {
    it('returns the correct number of leaf nodes', () => {
        const headers = [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
            {
                key: 'c',
                label: 'C',
                children: [
                    { key: 'd', label: 'D' },
                    { key: 'e', label: 'E' },
                ],
            },
        ]
        expect(leafCount(headers)).toBe(4)
    })
})

describe('flatHeadersToRows', () => {
    it('returns the headers as rows', () => {
        const headers = [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
            {
                key: 'c',
                label: 'C',
                children: [
                    { key: 'd', label: 'D' },
                    { key: 'e', label: 'E' },
                ],
            },
        ]
        const rows = flatHeadersToRows(headers, depthCount(headers))

        expect(rows).toEqual([
            [
                { key: 'a', label: 'A', rowSpan: 2, scope: 'col' },
                { key: 'b', label: 'B', rowSpan: 2, scope: 'col' },
                { key: 'c', label: 'C', colSpan: 2, scope: 'colgroup' },
            ],
            [
                { key: 'd', label: 'D', rowSpan: 1, scope: 'col' },
                { key: 'e', label: 'E', rowSpan: 1, scope: 'col' },
            ],
        ])
    })
})

describe('getHeaderKeys', () => {
    it('returns an array of header keys', () => {
        const headers = [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
            {
                key: 'c',
                label: 'C',
                children: [
                    { key: 'd', label: 'D' },
                    { key: 'e', label: 'E' },
                ],
            },
        ]
        const keys = getHeaderKeys(headers)
        expect(keys).toEqual(['a', 'b', 'c.d', 'c.e'])
    })
})

describe('defineColumnHeaders', () => {
    it('returns an array of column headers', () => {
        const headers = [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
            {
                key: 'c',
                label: 'C',
                children: [
                    { key: 'd', label: 'D' },
                    { key: 'e', label: 'E' },
                ],
            },
        ]
        const columnHeaders = defineColumnHeaders(headers)

        expect(columnHeaders).toEqual([
            { key: 'a', label: 'A', rowSpan: 2, scope: 'col' },
            { key: 'b', label: 'B', rowSpan: 2, scope: 'col' },
            { key: 'c', label: 'C', colSpan: 2, scope: 'colgroup' },
            { key: 'd', label: 'D', rowSpan: 1, scope: 'col' },
            { key: 'e', label: 'E', rowSpan: 1, scope: 'col' },
        ])
    })
})

describe('generateColumns', () => {
    it('returns an array of column headers', () => {
        const dataItem = {
            a: 1,
            b: 'hello',
            c: {
                d: true,
                e: {
                    f: 'world',
                },
            },
        }
        const columns = generateColumns(dataItem)
        expect(columns).toEqual([
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
            {
                key: 'c',
                label: 'C',
                children: [
                    { key: 'd', label: 'D' },
                    {
                        key: 'e',
                        label: 'E',
                        children: [{ key: 'f', label: 'F' }],
                    },
                ],
            },
        ])
    })
})

describe('depthCount', () => {
    it('returns the depth of the headers', () => {
        const headers = [
            { key: 'a', label: 'A' },
            { key: 'b', label: 'B' },
            { key: 'c', label: 'C', children: [{ key: 'd', label: 'D', children: [{ key: 'e', label: 'E' }] }] },
        ]
        expect(depthCount(headers)).toBe(3)
    })
})
