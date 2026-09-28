---
layout: home
markdownStyles: false
title: vueye-table
titleTemplate: The data framework for Vue
---

<HomePage>
<template v-slot:full>

```vue
<script setup lang="ts">
import { VueyeTable, defineColumns } from "vueye-table";

const columns = defineColumns<User>([
  { id: "name.first", header: "First name" },
  { id: "age", align: "end", format: (age) => `${age} years` },
  { id: "city" },
]);
</script>

<template>
  <VueyeTable :data="users" :columns="columns" selectable striped />
</template>
```

</template>
<template v-slot:styled>

```vue
<script setup lang="ts">
import { VtSearch, VtStatus, VtTable, VtToolbar } from "vueye-table";
import { provideDataTable, useDataTable } from "vueye-table";

const table = useDataTable({ data: users, columns });
provideDataTable(table);
</script>

<template>
  <VtToolbar>
    <VtSearch placeholder="Filter people" />
    <VtStatus />
  </VtToolbar>
  <VtTable :table="table" density="compact" bordered />
</template>
```

</template>
<template v-slot:headless>

```vue
<script setup lang="ts">
import { DataTableRoot, DataTableSearch } from "vueye-table";
import { useDataTable } from "vueye-table";

const table = useDataTable({ data: users, columns });
</script>

<template>
  <DataTableRoot :table="table" as="div">
    <DataTableSearch />
    <article v-for="row in table.rows" :key="row.key">
      {{ row.getDisplay("name.first") }}
    </article>
  </DataTableRoot>
</template>
```

</template>
<template v-slot:composables>

```ts
import { useDataTable } from "@vueye-table/vue";

const table = useDataTable({ data: users, columns });

table.search("lon");
table.toggleSort("age");

// Plain reactive properties: templates read them directly.
table.rows; // the current page
table.pageCount;
table.selectedCount;
```

</template>
<template v-slot:engine>

```ts
import { createTable } from "@vueye-table/core";

const table = createTable({ data: users, columns });

table.search("lon");
table.toggleSort("age");
table.getSnapshot().rows; // the current page
table.getState(); // plain data: save it, restore it, send it
table.exportRows(); // CSV of every filtered row
```

</template>
</HomePage>
