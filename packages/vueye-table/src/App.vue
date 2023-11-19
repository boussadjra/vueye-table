<script setup lang="ts">
import AppHeader from './components/app/layout/AppHeader.vue'

import { VueyeTable, defineTableColumnHeaders } from './components/core/VueyeTable'
//import { faker } from '@faker-js/faker'
// const items = Array.from({ length: 11 }, () => ({
//     id: faker.number.int({ min: 1, max: 100 }),
//     name: {
//         first_name: faker.person.firstName(),
//         last_name: faker.person.lastName(),
//     },
//     age: faker.number.int({ min: 18, max: 100 }),
//     country: faker.location.country() === 'Israel' ? 'Palestine' : faker.location.country(),
// }))
const items = [
    {
        id: 60,
        name: {
            first_name: 'Beth',
            last_name: 'Champlin',
        },
        age: 57,
        country: 'Saint Kitts and Nevis',
    },
    {
        id: 14,
        name: {
            first_name: 'Joe',
            last_name: 'Labadie',
        },
        age: 80,
        country: 'Saint Vincent and the Grenadines',
    },
    {
        id: 8,
        name: {
            first_name: 'Tierra',
            last_name: 'Walker',
        },
        age: 97,
        country: 'Mayotte',
    },
    {
        id: 88,
        name: {
            first_name: 'Diego',
            last_name: 'Baumbach',
        },
        age: 86,
        country: 'Somalia',
    },
    {
        id: 87,
        name: {
            first_name: 'Gabrielle',
            last_name: 'Ruecker',
        },
        age: 21,
        country: 'Australia',
    },
    {
        id: 15,
        name: {
            first_name: 'Rita',
            last_name: 'Volkman-Pfannerstill',
        },
        age: 56,
        country: 'Tajikistan',
    },
    {
        id: 62,
        name: {
            first_name: 'Kali',
            last_name: 'Schumm',
        },
        age: 48,
        country: 'Lithuania',
    },
    {
        id: 88,
        name: {
            first_name: 'Allan',
            last_name: 'Schuster',
        },
        age: 89,
        country: 'Hungary',
    },
    {
        id: 87,
        name: {
            first_name: 'Larry',
            last_name: 'Romaguera',
        },
        age: 79,
        country: 'Jamaica',
    },
    {
        id: 62,
        name: {
            first_name: 'Unique',
            last_name: 'Bailey',
        },
        age: 57,
        country: 'Angola',
    },
    {
        id: 4,
        name: {
            first_name: 'Jessie',
            last_name: 'Batz',
        },
        age: 31,
        country: 'Sint Maarten',
    },
]
const columns = defineTableColumnHeaders([
    {
        key: 'id',
        label: 'ID',
    },
    {
        key: 'name',
        label: 'Name',
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

const search = ref('')
</script>

<template>
    <div class="w-full">
        <AppHeader class="docs__header" />
        <main class="flex justify-center flex-col items-center p-4">
            <input v-model="search" class="input" placeholder="Search..." aria-label="Search" />
            <VueyeTable class="tbl" :data="items" :column-headers="columns" :per-page="5" :filter-query="search">
            </VueyeTable>
        </main>
    </div>
</template>
<style scoped>
.input {
    @apply p-2 border bg-primary-50 dark:bg-primary-950 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
}
</style>
