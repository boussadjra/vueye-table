<script setup lang="ts">
import { VueyeDropdown, OptionValue } from '../VueyeDropdown'
import ChevronRightIcon from '../icons/ChevronRightIcon.vue'
import ChevronLeftIcon from '../icons/ChevronLeftIcon.vue'
import DoubleChevronRightIcon from '../icons/DoubleChevronRightIcon.vue'
import DoubleChevronLeftIcon from '../icons/DoubleChevronLeftIcon.vue'

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
    <div class="table__pagination-wrapper">
        <VueyeDropdown
            :options="dropdownOptions"
            :default-value="dropdownDefaultValue"
            label="Per page"
            @update:modelValue="updatePerPage"
        />
        <span class="table__pagination-details">
            {{ (currentPage - 1) * perPage + 1 }} -
            {{ currentPage * perPage > total ? total : currentPage * perPage }} of {{ total }}
        </span>
        <ul class="table__pagination-btn-list">
            <li>
                <button
                    class="table__pagination-btn table__btn"
                    @click="setPage(1)"
                    :disabled="currentPage === 1"
                    aria-label="First page"
                >
                    <DoubleChevronLeftIcon />
                </button>
            </li>

            <li>
                <button
                    class="table__pagination-btn table__btn"
                    @click="setPage(props.currentPage - 1)"
                    :disabled="currentPage === 1"
                    aria-label="Previous page"
                >
                    <ChevronLeftIcon />
                </button>
            </li>

            <li v-for="page in pagesButtons" :key="page">
                <button
                    v-if="typeof page === 'number'"
                    class="table__pagination-btn table__btn"
                    :class="{ 'table__pagination-btn--current ': page === currentPage }"
                    @click="setPage(page)"
                    :aria-label="'Go to page ' + page"
                >
                    {{ page }}
                </button>
                <span v-else class="table__pagination-btn table__btn">...</span>
            </li>

            <li>
                <button
                    class="table__pagination-btn table__btn"
                    @click="setPage(currentPage + 1)"
                    :disabled="currentPage === pagesCount"
                    aria-label="Next page"
                >
                    <ChevronRightIcon />
                </button>
            </li>

            <li>
                <button
                    class="table__pagination-btn table__btn"
                    @click="setPage(total)"
                    :disabled="currentPage === pagesCount"
                    aria-label="Last page"
                >
                    <DoubleChevronRightIcon />
                </button>
            </li>
        </ul>
    </div>
</template>

<style></style>
