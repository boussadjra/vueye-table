<script setup lang="ts">
import { VueyeTable, defineTableColumnHeaders } from '../../components/core/VueyeTable'
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
    <Story title="Empty" icon="lucide:table-2">
        <p>When you have no data, you can use the <code>empty</code> slot to display a message.</p>
        <VueyeTable :data="[]" :column-headers="columns" />
        <div class="my-12" />

        <p>You can also use the `<code>empty</code>` slot to display a message when the data is empty.</p>
        <VueyeTable :data="[]" :column-headers="columns">
            <template #empty>
                <p class="text-xl lucide:cloud-off">There is no data to display.</p>
                <p />
            </template>
        </VueyeTable>
    </Story>
</template>

<style scoped></style>
