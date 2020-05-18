# Vueye Table

Vueye data table is a responsive data table component based on [Vue.js](http://vuejs.org), it organizes 
your data per pages in order to navigate easily.

![Vueye](https://raw.githubusercontent.com/boussadjra/vueye-table/master/src/assets/vueye.png )

This component allows you to :

* Paginate data
* Filter by field
* Sort columns
* Show only desired columns
* Custom cells rendering
* Other features are coming soon
## Demo
 [Vueye data table demo](https://boussadjra.github.io/vueye-table/)

 [Boilerplate in codesandbox](https://codesandbox.io/s/bold-star-s7hgw)

## Requirement
 * Vue.js ^2.6 + composition-api
 * It doesn't require any CSS framework

## Installation
```
npm install vueye-table --save
```
## Usage

```js
<template>
<div id="app">
    <VueyeTable :data="employees" :columns="columns" title="Employees" 
    filter-by="employee_salary" 
    select-rows
    v-model="selectedRows"
    >
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
import VueyeTable from "vueye-table";
import employees from './assets/employees.json'
export default {
       name: "App",
    data: () => ({
        employees,
        columns: [{
                key: "id",
                label: "ID",
                sortable: true,
                type: "number",
                display: true
            },
            {
                key: "employee_name",
                label: "Employee Name",
                sortable: true,
                display: true
            },
            {
                key: "employee_salary",
                label: "Employee Salary",
                display: true,
                sortable: true
            },
            {
                key: "employee_age",
                label: "Employee Age",
                sortable: true
            },
            {
                key: "address.city",
                label: "Address",
                sortable: true,
                sortable: true
            }
        ],
        selectedRows:[]
    }),
    components: {
        VueyeTable
    }
}
</script>

```

In main.js add `@vue/composition-api` plugin to make work with Vue.js 2 :


```js
import Vue from 'vue'
import App from './App.vue'
import VueComp from '@vue/composition-api'
Vue.config.productionTip = false

Vue.use(VueComp)

new Vue({
  render: h => h(App),
}).$mount('#app')

```
### Props 


|Name | Description |
|--------------------|------------------------|
| title | the data table title|
| columns | the attributes or columns|
| data | JS array of object or json content|
| filter-by | specify the default column for filter|
| per-page-values | the array of  per pages values |
| per-page | the default per page |
| select-rows | add checkbox columns in order to select rows |
| v-model | returns the selected rows |