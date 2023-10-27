import { describe, expect, it } from 'vitest'

import { PaginationProps } from '../../src/components/core/VueyeTable/components/VueyePagination/api'
import { VueyePagination } from '../../src/components/core/VueyeTable/components'
import { mount } from '@vue/test-utils'

describe('VueyePagination', () => {
    const propsData: PaginationProps = {
        perPage: 10,
        currentPage: 1,
        total: 100,
        perPageOptions: [10, 20, 30, 40, 50],
    }

    it('should render the correct number of pages', () => {
        const wrapper = mount(VueyePagination, { propsData })

        expect(wrapper.findAll('button.pagination__btn').length).toBe(7)
    })

    it('should emit an update:currentPage event when a page button is clicked', async () => {
        const wrapper = mount(VueyePagination, { propsData })
        await wrapper.findAll('button.pagination__btn').at(3).trigger('click')

        expect(wrapper.emitted('update:currentPage')).toBeTruthy()
        expect(wrapper.emitted('update:currentPage')![0]).toEqual([2])
    })

    it('should emit an update:perPage event when the per page dropdown is changed', async () => {
        const wrapper = mount(VueyePagination, { propsData })
        console.log(wrapper.html())

        await wrapper.find('.vueye-dropdown__trigger').trigger('click')
        await wrapper.find('.vueye-dropdown__option:nth-child(2)').trigger('click')

        expect(wrapper.emitted('update:perPage')).toBeTruthy()
        expect(wrapper.emitted('update:perPage')![0]).toEqual([20])
    })
})
