<template>
  <div id="app">
    <VueyeTable :data="employees" :columns="columns" title="Employees" :config="config">
      <template v-slot:header.cell.employee_salary="{columnDef}">
        <th style="background:#e3e3e3;color:#000;display:flex;height:48px">
          <span>{{columnDef.column.label}}</span>
          <span @click="columnDef.sorter.handler(columnDef.column)">
            <h4 v-if="columnDef.sorter.column.direction==='asc'">&#8593;</h4>
            <h4 v-else-if="columnDef.sorter.column.direction==='desc'">&#8595;</h4>
            <h4 v-else>&#8593;</h4>
          </span>
        </th>
      </template>
      <template v-slot:cell.employee_salary="{item}">
        <td style="background:#e3e3e3;color:#000;" data-label="employee_salary">
          <b
            v-if="item.employee_salary>100000"
            style="background:#3bb640;color:white;padding:3px;border-radius:2px"
          >{{item.employee_salary}}</b>
          <b
            v-else
            style="background:#ee4422;color:white;padding:3px;border-radius:2px"
          >{{item.employee_salary}}</b>
        </td>
      </template>
      <template v-slot:header.cell.employee_name="{columnDef}">
        <th class="ve-table-custom-cell">{{columnDef.column.label}}</th>
      </template>
      <template v-slot:cell.employee_name="{item}">
        <td class="ve-table-custom-cell" data-label="Employee Salary">{{item.employee_name}}</td>
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
import employees from "../assets/employees.json";
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
    selectedRows: [],
    config: {
      filterBy: "Chercher par",
      search: "Chercher",
      nbRowsPerPage: "Nombre des lignes par page",
      of: "de"
    }
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
    getMoreDetails(id) {
      return this.employees.find(emp => emp.id === id);
    }
  },
  components: {
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

.ve-table-custom-cell {
  background: rgb(30, 118, 233);
  color: white;
}
</style>
