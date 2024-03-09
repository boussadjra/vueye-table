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
    <Story title="Loading" icon="lucide:loader">
        <Variant title="Default">
            <p>When you're loading data, you can use the <code>loading</code> prop to display a loading indicator.</p>
            <VueyeTable :data="[]" loading />
            <div class="my-12" />
        </Variant>

        <Variant title="Custom loader">
            <p>You can also use the `<code>loading</code>` slot to display a custom loading indicator.</p>
            <VueyeTable :data="[]" :column-headers="columns" loading>
                <template #loading>
                    <span class="text-center text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                            <path
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"
                            />
                        </svg>
                    </span>
                </template>
            </VueyeTable>
        </Variant>
    </Story>
</template>

<style scoped>
p {
    margin-bottom: 1.5rem;
}
</style>
