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

 [Boilerplate in codesandbox](https://codesandbox.io/s/bold-star-s7hgw)

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
import VueyeTable from "vueye-table";
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

In main.js `@vue/composition-api` plugin to make work with Vue.js 2 :


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
| columns | the attributes or columns, by default it takes the json object keys|
| data | JS array of object or json content|
