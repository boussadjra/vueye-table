import { describe, expect, it } from 'vitest'

import { VueyeDropdown } from '../../src/components/core/VueyeTable/components'
import { mount } from '@vue/test-utils'

describe('VueyeDropdown', () => {
    const options = [
        { label: 'Option 1', content: 'option1' },
        { label: 'Option 2', content: 'option2' },
        { label: 'Option 3', content: 'option3' },
    ]

    it('throws an error when no value is passed', () => {
        try {
            mount(VueyeDropdown, {
                props: {
                    options,
                },
            })
        } catch (e) {
            console.log('message ', e)
            expect(e.message).toContain('Missing required prop: "modelValue"')
        }
    })

    it('renders the selected option when a value is passed', async () => {
        const wrapper = mount(VueyeDropdown, {
            props: {
                options,
                modelValue: 'option2',
            },
        })

        expect(wrapper.find('.dropdown__trigger span:first-child').text()).toBe('Option 2')

        await wrapper.setProps({ modelValue: 'option3' })

        expect(wrapper.find('.dropdown__trigger span:first-child').text()).toBe('Option 3')
    })

    it('emits an event when an option is selected', async () => {
        const wrapper = mount(VueyeDropdown, {
            props: {
                options,
            },
        })

        await wrapper.find('.dropdown__trigger').trigger('click')
        await wrapper.findAll('.dropdown__menu__item')[1].trigger('click')

        expect(wrapper.emitted('update:modelValue')).toBeTruthy()
        expect(wrapper.emitted('update:modelValue')[0]).toEqual(['option2'])
    })
})
