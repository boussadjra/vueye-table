<template>
  <div id="app">
    <VueyeTable bordered :data="employees" :columns="columns"  title="Employees" filter-by="employee_salary">
      <template v-slot:employee_salary="{item}">
        <b
          v-if="item.employee_salary>100000"
          style="background:#3bb640;color:white;padding:3px;border-radius:2px"
        >{{item.employee_salary}}</b>
        <b v-else style="background:#ee4422;color:white;padding:3px;border-radius:2px">{{item.employee_salary}}</b>
      </template>
      <template v-slot:actions="{item}">
        <div class="ve-table-actions">
          <button class="ve-table-btn ve-table-btn-primary" @click="edit(item)">Edit</button>
          <button class="ve-table-btn ve-table-btn-danger" @click="deleteItem(item)">Delete</button>
        </div>
      </template>
      <template v-slot:expand="{item}">
    <div style="padding:10px">
    
          <div >
            Details
          </div>
          <div>
            <ul>
              <li v-for="(val, key,index) in getMoreDetails(item.id)" :key="index">
              <strong>{{key}} : </strong> {{val}}
              </li>
            </ul>
          </div>
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
    },
    getMoreDetails(id){
      return this.employees.find(emp=>emp.id===id)
    }
  },
  components: {
    VueyeTable
  }
};
</script>

<style lang="scss">


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
