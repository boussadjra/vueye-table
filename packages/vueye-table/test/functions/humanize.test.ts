import { describe, expect, it } from 'vitest'

import { humanize } from '../../src/components/core/VueyeTable/utils/humanize'

describe('humanize', () => {
    it('should replace underscores with spaces', () => {
        expect(humanize('foo_bar')).toBe('Foo Bar')
    })

    it('should capitalize the first letter of each word', () => {
        expect(humanize('hello_world')).toBe('Hello World')
        expect(humanize('the_quick_brown_fox')).toBe('The Quick Brown Fox')
    })

    it('should handle empty strings', () => {
        expect(humanize('')).toBe('')
    })

    it('should handle strings with no underscores', () => {
        expect(humanize('hello')).toBe('Hello')
    })

    it('should handle strings with leading underscores', () => {
        expect(humanize('_hello')).toBe('Hello')
    })

    it('should handle strings with trailing underscores', () => {
        expect(humanize('hello_')).toBe('Hello')
    })

    it('should handle strings with multiple consecutive underscores', () => {
        expect(humanize('hello__world')).toBe('Hello World')
    })

    it('should handle strings camel case', () => {
        expect(humanize('helloWorld')).toBe('Hello World')
    })
})
