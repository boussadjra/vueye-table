# Basic example :

```vue
<template>
    <div>
        <vueye-table :data="data" :columns="columns" />
    </div>
</template>

<script>
import VueyeTable from '../../components/VueyeTable.vue'

export default {
    components: {
        VueyeTable,
    },
    data() {
        return {
            data: [
                { id: 1, name: 'John', age: 20 },
                { id: 2, name: 'Jane', age: 24 },
                { id: 3, name: 'Susan', age: 16 },
                { id: 4, name: 'Chris', age: 55 },
                { id: 5, name: 'Dan', age: 40 },
            ],
            columns: [
                {
                    label: 'ID',
                    field: 'id',
                    type: 'number',
                    width: '40px',
                    numeric: true,
                },
                {
                    label: 'Name',
                    field: 'name',
                    type: 'string',
                    width: '100px',
                },
                {
                    label: 'Age',
                    field: 'age',
                    type: 'number',
                    width: '40px',
                    numeric: true,
                },
            ],
        }
    },
}
</script>
```
