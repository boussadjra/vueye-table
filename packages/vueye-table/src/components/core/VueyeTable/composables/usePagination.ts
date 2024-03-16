import { PaginationEmits } from '../components'

export function usePagination(
    props: {
        perPage?: number
        currentPage?: number
    } = {},
    emit: PaginationEmits
) {
    const pagination = ref({
        perPage: props.perPage || 10,
        currentPage: props.currentPage || 1,
    })

    watchEffect(() => {
        pagination.value.perPage = props.perPage || 10
        pagination.value.currentPage = props.currentPage || 1
    })

    watch(
        () => pagination.value.perPage,
        (newPerPage, oldPerPage) => {
            if (newPerPage !== oldPerPage) {
                updateCurrentPage(1)
            }
        }
    )

    function updateCurrentPage(page: number) {
        pagination.value.currentPage = page

        emit('update:currentPage', page)
    }

    function updatePerPage(perPage: number) {
        pagination.value.perPage = perPage

        emit('update:perPage', perPage)
    }

    return {
        pagination,
        updateCurrentPage,
        updatePerPage,
    }
}
