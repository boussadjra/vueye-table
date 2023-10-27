<script setup lang="ts">
import AppHeader from './components/app/layout/AppHeader.vue'

import { VueyeTable, defineTableColumnHeaders } from './components/core/VueyeTable'
import { faker } from '@faker-js/faker'
const items = Array.from({ length: 11 }, () => ({
    id: faker.number.int({ min: 1, max: 100 }),
    name: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
    },
    age: faker.number.int({ min: 18, max: 100 }),
    country: faker.location.country(),
}))

const columns = defineTableColumnHeaders([
    {
        key: 'id',
        label: 'ID',
    },
    {
        key: 'name',
        label: 'Name',
        labelClassName: 'font-bold text-blue-500',
        className: 'dark:bg-blue-900',
        children: [
            {
                key: 'first_name',
                label: 'First Name',
            },
            {
                key: 'last_name',
                label: 'Last Name',
            },
        ],
    },
    {
        key: 'age',
        label: 'Age',
    },
    {
        key: 'country',
        label: 'Country',
    },
])
</script>

<template>
    <div class="w-full">
        <AppHeader class="docs__header" />
        <main class="flex justify-center p-4">
            <VueyeTable :data="items" :column-headers="columns">
                <template #empty>
                    <p class="text-4xl text-gray-400 i-solar-inbox-broken"></p>
                </template>
            </VueyeTable>
        </main>
    </div>
</template>
<style>
.primary {
    @apply bg-primary-500;
}

.primary.hoverable {
    @apply hover:bg-primary-600;
}

.secondary {
    @apply bg-cyan-500;
}

.secondary.hoverable {
    @apply hover:bg-cyan-600;
}

.info {
    @apply bg-blue-500;
}

.info.hoverable {
    @apply hover:bg-blue-600;
}

.warning {
    @apply bg-yellow-500;
}

.warning.hoverable {
    @apply hover:bg-yellow-600;
}

.error {
    @apply bg-red-500;
}

.error.hoverable {
    @apply hover:bg-red-600;
}
</style>
