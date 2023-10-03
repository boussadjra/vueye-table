import { describe, expect, it } from 'vitest'
import { useHeaderKeys, useHeaders } from '../../src/components/core/VueyeTable/composables'

import { ColumnHeader } from '../../src/components/core/VueyeTable/types'
import { ref } from 'vue'

describe('useHeaders', () => {
    it('should return headers', () => {
        const columnHeaders = ref([
            {
                label: 'Name',
                key: 'name',
                children: [
                    {
                        label: 'First Name',
                        key: 'firstName',
                    },
                    {
                        label: 'Last Name',
                        key: 'lastName',
                    },
                ],
            },
            {
                label: 'Age',
                key: 'age',
            },
        ])

        const { headers } = useHeaders(columnHeaders)

        expect(headers.value).toEqual([
            [
                {
                    label: 'Name',
                    key: 'name',
                    colSpan: 2,
                    scope: 'colgroup',
                },
                {
                    label: 'Age',
                    key: 'age',
                    rowSpan: 2,
                    scope: 'col',
                },
            ],
            [
                {
                    label: 'First Name',
                    key: 'firstName',
                    scope: 'col',
                    rowSpan: 1,
                },
                {
                    label: 'Last Name',
                    key: 'lastName',
                    scope: 'col',
                    rowSpan: 1,
                },
            ],
        ])
    })
})

describe('useHeaderKeys', () => {
    it('returns the correct header keys', () => {
        const columnHeaders: ColumnHeader[][] = [
            [
                { label: 'Name', key: 'name' },
                { label: 'Age', key: 'age' },
            ],
            [
                { label: 'Email', key: 'email' },
                { label: 'Phone', key: 'phone' },
            ],
        ]

        const { headerKeys } = useHeaderKeys(columnHeaders)

        expect(headerKeys.value).toEqual(['name', 'age', 'email', 'phone'])
    })
})
