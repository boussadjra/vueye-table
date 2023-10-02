export function usePagination(
    props: {
        perPage?: number
        currentPage?: number
    } = {}
) {
    const pagination = ref({
        perPage: props.perPage || 10,
        currentPage: props.currentPage || 1,
    })

    function updateCurrentPage(page: number) {
        pagination.value.currentPage = page
    }

    function updatePerPage(perPage: number) {
        pagination.value.perPage = perPage
    }

    return {
        pagination,
        updateCurrentPage,
        updatePerPage,
    }
}
