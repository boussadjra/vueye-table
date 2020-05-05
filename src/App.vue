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
</style>
