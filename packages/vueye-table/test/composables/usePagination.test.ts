import { describe, expect, it } from 'vitest'

import { usePagination } from '../../src/components/core/VueyeTable/composables/usePagination'

describe('usePagination', () => {
    it('should initialize pagination with default values', () => {
        const { pagination } = usePagination()

        expect(pagination.value.perPage).toBe(10)
        expect(pagination.value.currentPage).toBe(1)
    })

    it('should initialize pagination with provided values', () => {
        const { pagination } = usePagination({ perPage: 20, currentPage: 3 })

        expect(pagination.value.perPage).toBe(20)
        expect(pagination.value.currentPage).toBe(3)
    })

    it('should update current page', () => {
        const { pagination, updateCurrentPage } = usePagination()

        updateCurrentPage(2)

        expect(pagination.value.currentPage).toBe(2)
    })

    it('should update per page', () => {
        const { pagination, updatePerPage } = usePagination()

        updatePerPage(20)

        expect(pagination.value.perPage).toBe(20)
    })
})
