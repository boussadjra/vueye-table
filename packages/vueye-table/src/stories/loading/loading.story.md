# Basic example :

Just import the component and use it with the data you want to display. No need to specify the columns, the component will automatically generate them from the data.

```vue
<script setup>
import { VueyeTable } from 'vueye-table'

const data = [
    {
        id: 49,
        name: {
            first_name: 'Adrehilde',
            last_name: 'Garcia',
        },
        age: 74,
        country: 'Andorre',
    },
    {
        id: 23,
        name: {
            first_name: 'Anémone',
            last_name: 'Colin',
        },
        age: 45,
        country: 'Rwanda',
    },
    {
        id: 64,
        name: {
            first_name: 'Adhémar',
            last_name: 'Schmitt',
        },
        age: 33,
        country: 'Guinée-Bissau',
    },
]
</script>
<template>
    <div>
        <vueye-table :data="data" />
    </div>
</template>
```

You can also specify the columns you want to display by using the `column-headers` prop. The `column-headers` prop is an array of objects with the following properties:

-   `key`: The key of the column in the data array
-   `label`: The label of the column
-   `children`: An array of objects with the same properties as the `column-headers` prop. This is used to create nested columns.

> Note: If you're using Typescript you can use the `defineColumnHeaders` function to define the type of the `column-headers` prop and get better type inference, like so: `const headers = defineColumnHeaders([/* your columns definition */])`

```vue
<script setup>
import { VueyeTable } from 'vueye-table'

const data = [
    {
        id: 49,
        name: {
            first_name: 'Adrehilde',
            last_name: 'Garcia',
        },
        age: 74,
        country: 'Andorre',
    },
    {
        id: 23,
        name: {
            first_name: 'Anémone',
            last_name: 'Colin',
        },
        age: 45,
        country: 'Rwanda',
    },
    {
        id: 64,
        name: {
            first_name: 'Adhémar',
            last_name: 'Schmitt',
        },
        age: 33,
        country: 'Guinée-Bissau',
    },
]

const columnHeaders = [
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
                label: 'First name',
            },
            {
                key: 'last_name',
                label: 'Last name',
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
    <div>
        <vueye-table :data="data" :column-headers="columnHeaders" />
    </div>
</template>
```
