import {
    depthCount,
    flatHeadersToRows,
    generateColumns,
    getHeaderKeys,
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
