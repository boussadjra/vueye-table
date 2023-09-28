<script setup lang="ts">
import VueyeDropdown, { OptionValue } from '../util-components/VueyeDropdown.vue'
const props = withDefaults(
    defineProps<{
        perPage: number
        currentPage: number
        total: number
        perPageOptions: number[]
    }>(),
    {
        perPage: 10,
        currentPage: 1,
        total: 0,
        perPageOptions: () => [10, 20, 30, 40, 50],
    },
)

const pagesCount = computed(() => Math.ceil(props.total / props.perPage))

const dropdownOptions = computed(() => {
    return props.perPageOptions.map((option) => ({
        value: option,
        label: option.toString(),
    }))
})

const dropdownDefaultValue = computed(() => {
    return dropdownOptions.value.find((option) => option.value === props.perPage)
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
        [] as (number | string)[],
    )
})

const emit = defineEmits<{
    (event: 'update:currentPage', value: number): void
    (event: 'update:perPage', value: number): void
}>()

function nextPage() {
    if (props.currentPage < pagesCount.value) {
        emit('update:currentPage', props.currentPage + 1)
    }
}

function prevPage() {
    if (props.currentPage > 1) {
        emit('update:currentPage', props.currentPage - 1)
    }
}

function firstPage() {
    if (props.currentPage > 1) {
        emit('update:currentPage', 1)
    }
}

function lastPage() {
    if (props.currentPage < pagesCount.value) {
        emit('update:currentPage', props.total)
    }
}

function goToPage(page: number) {
    if (page > 0 && page <= pagesCount.value) {
        emit('update:currentPage', page)
    }
}

function updatePerPage(perPage: OptionValue) {
    emit('update:perPage', Number(perPage))
}
</script>
<template>
    <div class="pagination__wrapper">
        <div>
            <VueyeDropdown
                :options="dropdownOptions"
                :default-value="dropdownDefaultValue"
                label="Per page"
                @update:modelValue="updatePerPage"
            />
        </div>
        <div>
            <span class="pagination__details">
                {{ (currentPage - 1) * perPage + 1 }} -
                {{ currentPage * perPage > total ? total : currentPage * perPage }} of {{ total }}
            </span>
        </div>
        <ul class="pagination__btn-list">
            <li>
                <button class="pagination__btn" @click="firstPage" :disabled="currentPage === 1">
                    <span class="sr-only">First page</span>
                    <span aria-hidden="true" class="i-solar-alt-arrow-left-linear"></span>
                </button>
            </li>

            <li>
                <button class="pagination__btn" @click="prevPage" :disabled="currentPage === 1">
                    <span class="sr-only">Previous page</span>
                    <span aria-hidden="true" class="i-solar-double-alt-arrow-left-linear"></span>
                </button>
            </li>

            <li v-for="page in pagesButtons" :key="page">
                <button
                    v-if="typeof page === 'number'"
                    class="pagination__btn"
                    :class="{ 'pagination__btn--current': page === currentPage }"
                    @click="goToPage(page)"
                >
                    {{ page }}
                </button>
                <span v-else class="pagination__btn">...</span>
            </li>

            <li>
                <button class="pagination__btn" @click="nextPage" :disabled="currentPage === pagesCount">
                    <span class="sr-only">Next page</span>
                    <span aria-hidden="true" class="i-solar-alt-arrow-right-linear"></span>
                </button>
            </li>

            <li>
                <button class="pagination__btn" @click="lastPage" :disabled="currentPage === pagesCount">
                    <span class="sr-only">Last page</span>
                    <span aria-hidden="true" class="i-solar-double-alt-arrow-right-linear"></span>
                </button>
            </li>
        </ul>
    </div>
</template>

<style scoped>
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
    @apply p-2 border bg-transparent border-primary-200 dark:border-primary-800 disabled:opacity-50 disabled:cursor-not-allowed w-8 h-8 flex items-center justify-center;
}

.pagination__btn--current {
    @apply bg-primary-200 dark:bg-primary-800;
}
</style>
