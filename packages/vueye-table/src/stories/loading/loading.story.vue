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
    <Story title="Loading" icon="lucide:table-2">
        <p>When you're loading data, you can use the <code>loading</code> prop to display a loading indicator.</p>
        <VueyeTable :data="[]" loading />
        <div class="my-12" />

        <p>You can also use the `<code>loading</code>` slot to display a custom loading indicator.</p>
        <VueyeTable :data="[]" :column-headers="columns">
            <template #loading>
                <p class="text-center text-red-400 lucide:empty">Loading...</p>
            </template>
        </VueyeTable>
    </Story>
</template>

<style scoped></style>
