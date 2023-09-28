import { describe, expect, it } from 'vitest'

import { getBodyRows } from '../../src/components/core/VueyeTable/utils/body'

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

const rows = [
    {
        product: 'Product 1',
        sales: {
            '2022': {
                jan: 100,
                feb: 200,
                mar: 300,
            },
            '2023': 400,
        },
    },
    {
        product: 'Product 2',
        sales: {
            '2022': {
                jan: 500,
                feb: 600,
                mar: 700,
            },
            '2023': 800,
        },
    },
    {
        product: 'Product 3',
        sales: {
            '2022': {
                jan: 250,
                feb: 840,
                mar: 550,
            },
            '2023': 930,
        },
    },
    {
        product: 'Product 4',
        sales: {
            '2022': {
                jan: 120,
                feb: 830,
                mar: 670,
            },
            '2023': 340,
        },
    },
]
describe('body', () => {
    it('should return a flat array of body rows', () => {
        const expected = [
            {
                product: 'Product 1',
                'sales.2022.jan': 100,
                'sales.2022.feb': 200,
                'sales.2022.mar': 300,
                'sales.2023': 400,
            },
            {
                product: 'Product 2',
                'sales.2022.jan': 500,
                'sales.2022.feb': 600,
                'sales.2022.mar': 700,
                'sales.2023': 800,
            },
            {
                product: 'Product 3',
                'sales.2022.jan': 250,
                'sales.2022.feb': 840,
                'sales.2022.mar': 550,
                'sales.2023': 930,
            },
            {
                product: 'Product 4',
                'sales.2022.jan': 120,
                'sales.2022.feb': 830,
                'sales.2022.mar': 670,
                'sales.2023': 340,
            },
        ]
        const actual = getBodyRows(rows, headers)
        expect(actual).toEqual(expected)
    })
})
