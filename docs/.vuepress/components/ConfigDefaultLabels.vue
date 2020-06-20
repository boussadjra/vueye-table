<template>
  <VueyeTable 
     :data="employees" 
     :columns="columns"
      title="Employees"
      :config='config'
      >
      </VueyeTable>
</template>

<script>
import employees from "../assets/employees.json";
export default {
  name: "ConfigDefaultLabels",
  data: () => ({
    employees: employees,
      config: {
      filterBy: "Chercher par",
      search: "Chercher",
      nbRowsPerPage: "Nombre des lignes par page",
      of: "de"
    },
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
  })
};
</script>


