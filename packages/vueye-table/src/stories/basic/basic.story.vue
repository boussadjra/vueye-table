<script setup lang="ts">
import { defineTableColumnHeaders, VueyeTable } from '@/components/core/VueyeTable'
import { fakerFR as faker } from '@faker-js/faker'
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
        className: 'dark:text-green-500',
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
    <Story title="Basic" icon="lucide:table-2">
        <p>The most basic table. It will automatically generate columns and rows from the data you provide.</p>
        <VueyeTable :data="items" />
        <div class="my-12" />
        <p>You can also provide columns to customize the table.</p>
        <VueyeTable :data="items" :columns="columns" />
    </Story>
</template>

<style scoped></style>
