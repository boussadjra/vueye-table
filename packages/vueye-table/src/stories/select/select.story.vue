<script setup lang="ts">
import { VueyeTable, defineTableColumnHeaders } from '@/components/core/VueyeTable'
import { faker } from '@faker-js/faker'
const items = Array.from({ length: 11 }, () => ({
    id: faker.number.int({ min: 1, max: 100 }),
    name: {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
    },
    age: faker.number.int({ min: 18, max: 100 }),
    country: faker.location.country() === 'Israel' ? 'Palestine' : faker.location.country(),
}))

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

const selected = ref([])
</script>

<template>
    <Story title="Selection" icon="lucide:check-square">
        <Variant title="Default">
            <p>Binding the <code>selected</code> prop to an array will enable selection.</p>

            <VueyeTable :data="items" :column-headers="columns" v-model:selected="selected"> </VueyeTable>
        </Variant>

        <Variant title="Select mode">
            <p>
                You can change the select mode by using the <code>select-mode</code> prop. The default value is
                <code>`all`</code>. which selects all the rows across all pages.
            </p>
            <p>You can also use <code>`page`</code> to select all the rows on the current page</p>

            <VueyeTable :data="items" :column-headers="columns" v-model:selected="selected" select-mode="page">
            </VueyeTable>
        </Variant>
    </Story>
</template>
<style></style>
