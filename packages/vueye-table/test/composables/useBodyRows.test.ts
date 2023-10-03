import { beforeEach, describe, expect, it } from 'vitest'

import { ref } from 'vue'
import { useBodyRows } from '../../src/components/core/VueyeTable'

describe('useBodyRows', () => {
    // beforeEach(() => {
    const rows = ref([
        { id: 1, name: 'John', age: 30 },
        { id: 2, name: 'Jane', age: 25 },
        { id: 3, name: 'Bob', age: 40 },
        { id: 4, name: 'Alice', age: 35 },
    ])
    const headers = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'age', label: 'Age' },
    ]
    const pagination = ref({
        perPage: 2,
        currentPage: 2,
    })

    const { bodyRows } = useBodyRows(rows, headers, pagination)

    // })
    it('should return the correct body rows based on pagination', () => {
        expect(bodyRows.value).toEqual([
            { id: 3, name: 'Bob', age: 40 },
            { id: 4, name: 'Alice', age: 35 },
        ])
    })

    it('should return the correct body rows based on pagination and when change the perPage', () => {
        pagination.value.perPage = 3

        expect(bodyRows.value).toEqual([{ id: 4, name: 'Alice', age: 35 }])
    })

    it('should return the correct body rows based on pagination and when change the currentPage', () => {
        pagination.value.currentPage = 1

        expect(bodyRows.value).toEqual([
            { id: 1, name: 'John', age: 30 },
            { id: 2, name: 'Jane', age: 25 },
            { id: 3, name: 'Bob', age: 40 },
        ])
    })

    it('should return the correct body rows based on pagination and when change the currentPage and perPage', () => {
        pagination.value.currentPage = 2
        pagination.value.perPage = 3

        expect(bodyRows.value).toEqual([{ id: 4, name: 'Alice', age: 35 }])
    })

    it('should return the correct body rows based on pagination and when change the currentPage and perPage', () => {
        pagination.value.currentPage = 3
        pagination.value.perPage = 3

        expect(bodyRows.value).toEqual([])
    })

    it('should return the correct body rows based on pagination and when add a new row', () => {
        pagination.value.currentPage = 2
        rows.value.push({ id: 5, name: 'John', age: 30 })

        expect(bodyRows.value).toEqual([
            { id: 4, name: 'Alice', age: 35 },
            { id: 5, name: 'John', age: 30 },
        ])
    })
})
