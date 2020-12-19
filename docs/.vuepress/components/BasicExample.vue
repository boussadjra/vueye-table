<template>
  <VueyeTable 
     :header-display="false" 
     :data="employees" 
     :columns="columns"
      title="Employees">
      </VueyeTable>
</template>

<script>
import employees from "../assets/employees.js";
export default {
  name: "BasicExample",
  data: () => ({
    // employees: employees,
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
  computed:{
    employees(){
      return employees.slice();
    }
  }
};
</script>


