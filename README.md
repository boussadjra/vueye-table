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
    <VueyeTable :data="employees" :columns="columns" title="Employees" filter-by="employee_salary">
      <template v-slot:employee_salary="{item}">
        <b
          v-if="item.employee_salary>100000"
          style="background:#3bb640;color:white"
        >{{item.employee_salary}}</b>
        <b v-else style="background:#ee4422;color:white">{{item.employee_salary}}</b>
      </template>
      <template v-slot:actions="{item}">
        <div class="ve-table-actions">
          <button class="ve-table-btn ve-table-btn-primary" @click="edit(item)">Edit</button>
          <button class="ve-table-btn ve-table-btn-danger" @click="deleteItem(item)">Delete</button>
        </div>
      </template>
    </VueyeTable>
  </div>
</template>

<script>
import VueyeTable from "./components/VueyeTable.vue";
import employees from "./assets/employees.json";
export default {
  name: "App",
  data: () => ({
    employees: employees,
    columns: [
      {
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
        display: true,
        sortable: true
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        display: true
      }
    ],
    selectedRows: []
  }),
  methods: {
    edit(item) {
      //open a dialog to edit the selected item
      //or redirect to another page that contains
      // edit form
    },
    deleteItem(item) {
      this.employees = this.employees.filter(
        employee => employee.id !== item.id
      );
    }
  },
  components: {
    VueyeTable
  }
};
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.ve-table {
  &-actions {
    width: 104px;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  &-btn {
    height: 24px;
    min-width: 32px;
    padding: 0 8px;
    text-align: center;
    border-radius: 4px;

    cursor: pointer;
    justify-content: center;
    outline: none;
    border: none;
    position: relative;
    white-space: nowrap;
    &-primary {
      background: #3844cc;
      color: white;
    }
    &-danger {
      background: #e24e40;
      color: white;
    }
  }
}
</style>


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