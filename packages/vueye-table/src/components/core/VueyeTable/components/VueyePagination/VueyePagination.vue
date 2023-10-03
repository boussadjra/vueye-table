<script setup lang="ts">
import { VueyeDropdown, OptionValue } from '../VueyeDropdown'
import { PaginationEmits, PaginationProps, paginationPropsDefaults } from './api'

const props = withDefaults(defineProps<PaginationProps>(), paginationPropsDefaults)

const pagesCount = computed(() => Math.ceil(props.total / props.perPage))

const dropdownOptions = computed(() => {
    return props.perPageOptions.map((option) => ({
        content: option,
        label: option.toString(),
    }))
})

const dropdownDefaultValue = computed(() => {
    return dropdownOptions.value.find((option) => option.content === props.perPage)
})

const pagesButtons = computed(() => {
    return Array.from({ length: pagesCount.value }, (_, i) => i + 1).reduce(
        (acc, curr) => {
            if (
                curr === 1 ||
                curr === props.total ||
                (curr >= props.currentPage - 2 && curr <= props.currentPage + 2)
            ) {
                acc.push(curr)
            } else if (curr === props.currentPage - 3 || curr === props.currentPage + 3) {
                acc.push('...')
            }
            return acc
        },
        [] as (number | string)[]
    )
})

const emit = defineEmits<PaginationEmits>()

function updatePerPage(perPage: OptionValue) {
    emit('update:perPage', Number(perPage))
}

function setPage(newPage: number) {
    if (newPage >= 1 && newPage <= pagesCount.value) {
        emit('update:currentPage', newPage)
    }
}
</script>
<template>
    <div class="pagination__wrapper">
        <VueyeDropdown
            :options="dropdownOptions"
            :default-value="dropdownDefaultValue"
            label="Per page"
            @update:modelValue="updatePerPage"
        />
        <span class="pagination__details">
            {{ (currentPage - 1) * perPage + 1 }} -
            {{ currentPage * perPage > total ? total : currentPage * perPage }} of {{ total }}
        </span>
        <ul class="pagination__btn-list">
            <li>
                <button
                    class="pagination__btn"
                    @click="setPage(1)"
                    :disabled="currentPage === 1"
                    aria-label="First page"
                >
                    <span aria-hidden="true" class="i-solar-alt-arrow-left-linear"></span>
                </button>
            </li>

            <li>
                <button
                    class="pagination__btn"
                    @click="setPage(props.currentPage - 1)"
                    :disabled="currentPage === 1"
                    aria-label="Previous page"
                >
                    <span aria-hidden="true" class="i-solar-double-alt-arrow-left-linear"></span>
                </button>
            </li>

            <li v-for="page in pagesButtons" :key="page">
                <button
                    v-if="typeof page === 'number'"
                    class="pagination__btn"
                    :class="{ 'pagination__btn--current': page === currentPage }"
                    @click="setPage(page)"
                    :aria-label="'Go to page ' + page"
                >
                    {{ page }}
                </button>
                <span v-else class="pagination__btn">...</span>
            </li>

            <li>
                <button
                    class="pagination__btn"
                    @click="setPage(currentPage + 1)"
                    :disabled="currentPage === pagesCount"
                    aria-label="Next page"
                >
                    <span aria-hidden="true" class="i-solar-alt-arrow-right-linear"></span>
                </button>
            </li>

            <li>
                <button
                    class="pagination__btn"
                    @click="setPage(total)"
                    :disabled="currentPage === pagesCount"
                    aria-label="Last page"
                >
                    <span aria-hidden="true" class="i-solar-double-alt-arrow-right-linear"></span>
                </button>
            </li>
        </ul>
    </div>
</template>

<style>
.pagination__wrapper {
    @apply flex gap-x-3 items-center;
}

.pagination__details {
    @apply text-sm text-gray-500 dark:text-gray-400;
}

.pagination__btn-list {
    @apply flex;
}
.pagination__btn {
    @apply p-2 border bg-transparent border-primary-200 dark:border-primary-800 disabled:opacity-50 disabled:cursor-not-allowed w-8 h-8 flex items-center justify-center focus:outline-none focus:ring focus:border-primary-500;
}

.pagination__btn--current {
    @apply bg-primary-200 dark:bg-primary-800;
}
</style>
