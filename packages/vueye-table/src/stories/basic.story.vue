<script setup lang="ts">
import { VueyeTable } from '../components/core/VueyeTable'
import { fakerAR as faker } from '@faker-js/faker'
const items = Array.from({ length: 11 }, () => ({
    id: faker.datatype.uuid().slice(0, 4),
    name: {
        first_name: faker.name.firstName(),
        last_name: faker.name.lastName(),
    },
    age: faker.datatype.number({ min: 18, max: 100 }),
    country: faker.address.country(),
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
