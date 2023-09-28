import { defineComponent, h } from 'vue'

export type PaginationProps = {
    perPage: number
    currentPage: number
    total: number
}

export const VueyePagination = defineComponent(
    (props: PaginationProps) => () => {
        return h(
            'div',
            {
                class: 'vueye-pagination ',
            },
            [
                h(
                    'div',
                    {
                        class: 'vueye-pagination__info',
                    },
                    [
                        h(
                            'span',
                            {
                                class: 'vueye-pagination__info__text',
                            },
                            `Showing ${props.perPage * (props.currentPage - 1) + 1} to ${
                                props.perPage * props.currentPage
                            } of ${props.perPage * props.currentPage} entries`,
                        ),
                    ],
                ),
            ],
        )
    },
    {
        props: {
            perPage: {
                type: Number,
                default: 10,
            },
            currentPage: {
                type: Number,
                default: 1,
            },
            total: {
                type: Number,
                default: 0,
            },
        },
    },
)
