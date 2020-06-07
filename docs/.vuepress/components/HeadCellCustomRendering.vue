<template>
  <div id="app">
    <VueyeTable :data="employees" :columns="columns" title="Employees">
      <template v-slot:header.cell.employee_salary="{column}">
        <th style="background:#e3e3e3;color:#000;">{{column.label}}</th>
      </template>
      <template v-slot:cell.employee_salary="{item}">
        <td style="background:#e3e3e3;color:#000;">
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
      <template v-slot:header.cell.employee_name="{column}">
        <th class="ve-table-custom-cell">{{column.label}}</th>
      </template>
      <template v-slot:cell.employee_name="{item}">
        <td class="ve-table-custom-cell">{{item.employee_name}}</td>
      </template>
    </VueyeTable>
  </div>
</template>

<script>
import employees from "../assets/employees.json";
export default {
  name: "HeadCellCustomRendering",
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
      }
    ]
  }),
  methods: {}
};
</script>

<style lang="scss">
.ve-table-custom-cell {
  background: rgb(30, 118, 233);
  color: white;
}
</style>
