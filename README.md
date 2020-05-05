# Vueye DataTable

Vueye data table is a responsive data table component based on [Vue.js](http://vuejs.org), it organizes 
your data per pages in order to navigate easily.

![Vueye](https://raw.githubusercontent.com/boussadjra/vueye-table/master/src/assets/vueye.png )

This component allows you to :

* Sort columns
* Show only desired columns
* Custom cells rendering
* Other features are coming soon
## Demo
 [Vueye data table demo](https://boussadjra.github.io/vueye-table/)

## Requirement
 * Vue.js 2 + composition-api
 * It doesn't require any css framework
## Installation
```
npm install vueye-table --save
```
## Use

```js
<template>
...
<template>
<div id="app">
    <VueyeTable :data='employees' :columns='columns' title="My Table" >

    <template v-slot:id="{item}">
        <i>{{item.id}}</i>
      </template>
        <template v-slot:employee_name="{item}">
        <b>{{item.employee_name}}</b>
      </template>
  
    </VueyeTable>
</div>
</template>

<script>
import VueyeTable from './components/VueyeTable.vue'
import employees from './assets/employees.json'
export default {
    name: 'App',
    data: () => ({
        employees,
        columns: [{
                key: "id",
                label: "ID",
                sortable: true,
                type: 'number',
                display:true
            },
            {
                key: "employee_name",
                label: "Employee Name",
                sortable: true,
                display:true

            },
            {
                key: "employee_salary",
                label: "Employee Salary",
                display:true,
                sortable: true,
            },   {
                key: "employee_age",
                label: "Employee Age",
                sortable: true
            }, {
                key: "address.city",
                label: "Address",
                sortable: true,
                sortable: true,

            },
           
        ]
    }),
    components: {
        VueyeTable
    },

}
</script>

```
### Props 


|Name | Description |
|--------------------|------------------------|
| title | the data table title|
| columns | the attributes or columns, by default it takes the json object keys|
| data | JS array of object or json content|
