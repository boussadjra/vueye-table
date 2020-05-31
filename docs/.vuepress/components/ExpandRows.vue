<template>
  <div>
    <VueyeTable :data="employees" :columns="columns" title="Employees">
      <template v-slot:expand="{item}">
        <div style="padding:10px">
          <div>Details</div>
          <div>
            <ul>
              <li v-for="(val, key,index) in getMoreDetails(item.id)" :key="index">
                <strong>{{key}} :</strong>
                {{val}}
              </li>
            </ul>
          </div>
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
    ]
  }),
  methods: {
    getMoreDetails(id) {
      return this.employees.find(emp => emp.id === id);
    }
  }
};
</script>
