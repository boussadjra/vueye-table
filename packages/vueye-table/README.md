# Vueye Table

Vueye Table is a Vue 3 component for displaying data in a table.

## Installation

Vue 3:

```bash
npm install vueye-table
```

Nuxt :

```bash
npm install nuxt-vueye-table
```

## Usage

Vue :

```html
<script setup lang="ts">
    import { VueyeTable } from 'vueye-table'

    const items = [
        {
            id: 60,
            name: {
                first_name: 'Brahim',
                last_name: 'Boussadjra',
            },
            age: 30,
            address: {
                country: 'Algeria',
                city: 'Algiers',
            },
        },
        //...
    ]
</script>

<template>
    <VueyeTable :data="items" />
</template>
```

Nuxt :

```js
// nuxt.config.js
export default defineNuxtConfig({
    modules: ['nuxt-vueye-table'],
    // ...
})
```

### VueyeTableProps

| Prop Name | Type | Default Value | Description |
| --- | --- | --- | --- |
| data | TData[] | [] | An array of data for the table. |
| columnHeaders | TColumn[] or a function returning an array | [] | An array of column headers for the table. |
| itemValue | string | 'id' | The property name used as a unique identifier for each item. |
| perPage | number | 10 | The number of items displayed per page. |
| currentPage | number | 1 | The current page number. |
| perPageOptions | number[] or a function returning an array | [5, 10, 20, 30] | An array of options for the number of items per page. |
| loading | boolean | false | Indicates whether the table is in a loading state. |
| selected | TData[], Row[], or null | null | An array of selected items or rows. |
| selectMode | 'page' or 'all' | 'all' | The mode for selecting items: 'page' or 'all'. |
| caption | string | '' | The table's caption. |
| summary | string | '' | The table's summary. |

### VueyeTableEmits

| Emit Name       | Parameters     | Description                           |
| --------------- | -------------- | ------------------------------------- |
| update:loading  | value: boolean | Emits when the loading state changes. |
| update:selected | value: T[]     | Emits when the selected items change. |

### PaginationEmits

| Emit Name          | Parameters    | Description                                      |
| ------------------ | ------------- | ------------------------------------------------ |
| update:currentPage | value: number | Emits when the current page changes.             |
| update:perPage     | value: number | Emits when the number of items per page changes. |

### SlotHeader

The SlotHeader component defines various slots for customizing the table header.

-   `headerCell.<ColumnKey>`: Slot for customizing the content of a specific column header.
-   `headerCellContent.<ColumnKey>`: Slot for customizing the content within a specific column header cell.
-   `headers`: Slot for customizing the entire table header, containing all column headers.
-   `checkbox`: Slot for customizing the checkbox used for selecting all items.

### SlotRow

The SlotRow component defines various slots for customizing the table rows.

-   `itemCell.<ItemKey>`: Slot for customizing the content of a specific item cell within a row.
-   `itemCellContent.<ItemKey>`: Slot for customizing the content within a specific item cell.
-   `rows`: Slot for customizing the entire table rows, containing all rows.
-   `row`: Slot for customizing a specific row.
-   `checkbox`: Slot for customizing the checkbox used for selecting a specific row.

You can use these Markdown tables to document the props, emits, and slot definitions for the data table and pagination components in your Vue 3 project.
