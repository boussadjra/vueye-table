<script lang="ts" setup>
import { VueyeTable } from 'vueye-table';

const columnHeaders = [
  {
    label: 'ID',
    key: 'id',
    sortable: true,
  },
  {
    label: 'Name',
    key: 'name',
    sortable: true,
  },
  {
    label: 'Email',
    key: 'email',
    sortable: true,
  },
  {
    label: 'Phone',
    key: 'phone',
    sortable: true,
  },
  {
    label: 'Website',
    key: 'website',
    sortable: true,
  },
];

const data = [
  {
    id: 1,
    name: 'Leanne Graham',
    email: 'leanne@example.com',
    phone: '1-770-736-8031 x56442',
    website: 'hildegard.org',
  },
  {
    id: 2,
    name: 'Ervin Howell',
    email: '',
    phone: '010-692-6593 x09125',
    website: 'anastasia.net',
  },
];
</script>

<template>
  <div class="container mx-auto min-h-screen">
    Here is the playground

    <VueyeTable :column-headers="columnHeaders" :data="data" />
  </div>
</template>
