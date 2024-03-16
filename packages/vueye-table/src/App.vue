<script setup lang="ts">
import AppHeader from './components/app/layout/AppHeader.vue'

import { VueyeTable, defineTableColumnHeaders, defineFilterMethod } from './components/core/VueyeTable'

const items = [
    {
        id: 60,
        name: {
            first_name: 'Beth',
            last_name: 'Champlin',
        },
        age: 57,
        address: {
            country: 'Saint Kitts and Nevis',
            city: 'Basseterre',
        },
    },
    {
        id: 14,
        name: {
            first_name: 'Joe',
            last_name: 'Labadie',
        },
        age: 80,
        address: {
            country: 'Saint Vincent and the Grenadines',
            city: 'Kingstown',
        },
    },
    {
        id: 8,
        name: {
            first_name: 'Tierra',
            last_name: 'Walker',
        },
        age: 97,
        address: {
            country: 'Mayotte',
            city: 'Mamoudzou',
        },
    },
    {
        id: 88,
        name: {
            first_name: 'Diego',
            last_name: 'Baumbach',
        },
        age: 86,
        address: {
            country: 'Somalia',
            city: 'Mogadishu',
        },
    },
    {
        id: 87,
        name: {
            first_name: 'Gabrielle',
            last_name: 'Ruecker',
        },
        age: 21,
        address: {
            country: 'Australia',
            city: 'Sydney',
        },
    },
    {
        id: 15,
        name: {
            first_name: 'Rita',
            last_name: 'Volkman-Pfannerstill',
        },
        age: 56,
        address: {
            country: 'Tajikistan',
            city: 'Dushanbe',
        },
    },
    {
        id: 62,
        name: {
            first_name: 'Kali',
            last_name: 'Schumm',
        },
        age: 48,
        address: {
            country: 'Lithuania',
            city: 'Vilnius',
        },
    },
    {
        id: 88,
        name: {
            first_name: 'Allan',
            last_name: 'Schuster',
        },
        age: 89,
        address: {
            country: 'Hungary',
            city: 'Budapest',
        },
    },
    {
        id: 87,
        name: {
            first_name: 'Larry',
            last_name: 'Romaguera',
        },
        age: 79,
        address: {
            country: 'Jamaica',
            city: 'Kingston',
        },
    },
    {
        id: 62,
        name: {
            first_name: 'Unique',
            last_name: 'Bailey',
        },
        age: 57,
        address: {
            country: 'Angola',
            city: 'Luanda',
        },
    },
    {
        id: 4,
        name: {
            first_name: 'Jessie',
            last_name: 'Batz',
        },
        age: 31,
        address: {
            country: 'Sint Maarten',
            city: 'Philipsburg',
        },
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
    // {
    //     key: 'country',
    //     label: 'Country',
    // },
])

const search = ref('')

const customFilterMethod = defineFilterMethod<(typeof items)[0]>((query, item, filterBy) => {
    if (query && filterBy?.includes('address.country')) {
        return item['address.country'].toLowerCase().startsWith(query.toLowerCase())
    }
    return true
})
</script>

<template>
    <div>
        <AppHeader class="docs__header" />
        <main class="">
            <input v-model="search" class="input" placeholder="Search..." aria-label="Search" />
            <VueyeTable
                :data="items"
                :column-headers="columns"
                :per-page="5"
                :filter-query="search"
                :filter-method="customFilterMethod"
                :filter-by="['address.country']"
            >
            </VueyeTable>
        </main>
    </div>
</template>
<style scoped>
main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    justify-content: center;
    align-items: center;
}
</style>
