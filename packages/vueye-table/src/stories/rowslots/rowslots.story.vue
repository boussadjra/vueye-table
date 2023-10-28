<script setup lang="ts">
import { defineTableColumnHeaders, VueyeTable } from '../../components/core/VueyeTable'
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
    <Story title="Row slots" icon="lucide:table-2">
        <Variant title="rows">
            <p>You can use the <code>`rows`</code> slot to customize the rows.</p>
            <VueyeTable :data="items" :column-headers="columns">
                <template #rows="{ rows }">
                    <tr v-for="row in rows" :key="row.id">
                        <td>{{ row.id }}</td>
                        <td class="td first_name">{{ row.name.first_name }}</td>
                        <td class="td last_name">{{ row.name.last_name }}</td>
                        <td v-if="row.age < 40" class="td young">{{ row.age }}</td>
                        <td v-else class="td old">{{ row.age }}</td>
                        <td class="td country">{{ row.country }}</td>
                    </tr>
                </template>
            </VueyeTable>
        </Variant>

        <Variant title="row">
            <VueyeTable :data="items" :column-headers="columns">
                <template #row="{ row }">
                    <tr>
                        <td>{{ row.id }}</td>
                        <td class="td first_name">{{ row.name.first_name }}</td>
                        <td class="td last_name">{{ row.name.last_name }}</td>
                        <td v-if="row.age < 40" class="td young">{{ row.age }}</td>
                        <td v-else class="td old">{{ row.age }}</td>
                        <td class="td country">{{ row.country }}</td>
                    </tr>
                </template>
            </VueyeTable>
        </Variant>
    </Story>
</template>

<style scoped>
.td.first_name {
    @apply bg-purple-200 dark:bg-purple-700;
}
.td.last_name {
    @apply bg-amber-200 dark:bg-amber-700;
}
.td.young {
    @apply bg-green-200 dark:bg-indigo-700;
}
.td.old {
    @apply bg-red-200 dark:bg-teal-700;
}
.td.country {
    @apply bg-blue-200 dark:bg-blue-700;
}

.td {
    @apply !p-2;
}
</style>
