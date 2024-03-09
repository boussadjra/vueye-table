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
    <Story title="Header slots" icon="lucide:layout-template">
        <Variant title="headers">
            <p>You can use the <code>`headers`</code> slot to customize the headers.</p>
            <VueyeTable :data="items" :column-headers="columns">
                <template #headers="{ headers }">
                    <thead>
                        <tr v-for="(row, index) in headers" :key="index">
                            <template v-for="columnHeader in row" :key="columnHeader.key">
                                <th
                                    :colspan="columnHeader.colSpan"
                                    :rowspan="columnHeader.rowSpan"
                                    :scope="columnHeader.scope"
                                    class="th p-2 border opacity-70 border-gray-200 dark:border-gray-700 dark:bg-blue-800 dark:text-blue-200 bg-blue-400 text-gray-950"
                                    :class="columnHeader.className"
                                >
                                    <slot :name="`headerCellContent.${columnHeader.key}`" :headerItem="columnHeader">
                                        <span :class="columnHeader.labelClassName">
                                            {{ columnHeader.label }}
                                        </span>
                                    </slot>
                                </th>
                            </template>
                        </tr>
                    </thead>
                </template>
                <template #itemCell.name.first_name="{ itemCell }">
                    <td class="bg-indigo-200 dark:bg-indigo-800 text-center p-1">{{ itemCell.name.first_name }}</td>
                </template>
                <template #itemCell.name.last_name="{ itemCell }">
                    <td class="bg-green-300 text-green-950 dark:bg-green-900 dark:text-green-200">
                        {{ itemCell.name.last_name }}
                    </td>
                </template>

                <template #itemCell.country="{ itemCell }">
                    <td class="dark:bg-blue-800 dark:text-blue-200 bg-blue-300 text-blue-950">
                        {{ itemCell.country }}
                    </td>
                </template>
            </VueyeTable>
            <p>
                You must use the <code>`th`</code> tag to keep the table structure. You can use the
                <code>`colSpan`</code> and <code>`rowSpan`</code> props to customize the cell.
            </p>
        </Variant>
        <Variant title="Header cell">
            <p>You can use the <code>`headerCell`</code> slot to customize the header cell.</p>
            <VueyeTable :data="items" :column-headers="columns">
                <template #headerCell.name="{ headerItem }">
                    <th class="bg-blue-800 p-4 text-white" :colspan="headerItem.colSpan" :rowspan="headerItem.rowSpan">
                        {{ headerItem.label }}
                    </th>
                </template>
            </VueyeTable>
            <p>
                You must use the <code>`th`</code> tag to keep the table structure. You can use the
                <code>`colSpan`</code> and <code>`rowSpan`</code> props to customize the cell.
            </p>
        </Variant>

        <Variant title="Header cell content">
            <p>You can use the <code>`headerCellContent`</code> slot to customize the header cell content.</p>
            <VueyeTable :data="items" :column-headers="columns">
                <template #headerCellContent.age="{ headerItem }">
                    <span class="text-yellow-500 dark:text-yellow-500">{{ headerItem.label }}</span>
                </template>
            </VueyeTable>
        </Variant>

        <!-- important note -->
        <Variant title="Slot priority">
            <p>
                <code>`headerCell`</code> has a higher priority than <code>`headerCellContent`</code>. If you use both,
                the <code>`headerCell`</code> will be used and the <code>`headerCellContent`</code> will be ignored.
            </p>
            <VueyeTable :data="items" :column-headers="columns">
                <template #headerCell.name="{ headerItem }">
                    <th class="text-pink-500 dark:text-pink-500" :colSpan="headerItem.colSpan">
                        {{ headerItem.label }}
                    </th>
                </template>
                <template #headerCellContent.name="{ headerItem }">
                    <span class="text-yellow-500 dark:text-yellow-500">{{ headerItem.label }}</span>
                </template>
            </VueyeTable>
            <p></p>
        </Variant>
    </Story>
</template>
<style>
p {
    @apply my-2;
}
th {
    @apply p-2;
}
td {
    padding: 0.5rem;
    border: 1px solid #e2e8f0;
    text-align: center;
}
</style>
