<script setup lang="ts">
import { VueyeTable } from '../../components/core/VueyeTable'
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

const columns = [
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
]
</script>
<template>
    <Story title="Basic" icon="lucide:table-2">
        <VueyeTable :data="items" :column-headers="columns" />
    </Story>
</template>

<style scoped></style>
