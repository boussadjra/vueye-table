---
sidebar: auto
home: false
---

<script setup>
import { ref } from 'vue'

import { VueyeTable } from 'vueye-table'

const data = ref([
  { id: 1, name: 'John Doe', age: 20 },
  { id: 2, name: 'Jane Doe', age: 24 },
  { id: 3, name: 'John Smith', age: 30 },
  { id: 4, name: 'Jane Smith', age: 32 },
])

const columns = ref([
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
])
</script>

# Quick start

## Installation

::: code-group

```bash [pnpm]
pnpm add vueye-table
```

```bash [yarn]
yarn add vueye-table
```

```bash [npm]
npm install vueye-table
```

:::

## Usage

```vue
<script setup>
import { ref } from 'vue'

const data = ref([
    { id: 1, name: 'John Doe', age: 20 },
    { id: 2, name: 'Jane Doe', age: 24 },
    { id: 3, name: 'John Smith', age: 30 },
    { id: 4, name: 'Jane Smith', age: 32 },
])

const columns = ref([
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'age', label: 'Age' },
])
</script>
<template>
    <div>
        <vueye-table :data="data" :columns="columns" />
    </div>
</template>
```

<vueye-table :data="data" :columns="columns" />
