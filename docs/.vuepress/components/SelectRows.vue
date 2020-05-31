<template>
  <div>
    <VueyeTable
      :data="users"
      :columns="columns"
      select-rows
      v-model="selectedUsers"
      title="Users"
    ></VueyeTable>

<hr> 
   <pre class="language-js">
{{selectedUsers}}
   </pre>
  </div>
</template>

<script>
import axios from "axios";
export default {
  name: "BasicExample",
  data: () => ({
    users: [],
    selectedUsers: [],
    columns: [
      {
        key: "id",
        label: "ID",
        sortable: true,
        type: "number",
        display: true
      },
      {
        key: "name",
        label: "Name",
        sortable: true,
        display: true
      },
      {
        key: "username",
        label: "User name",
        sortable: true,
        display: true
      },

      {
        key: "address.city",
        label: "City",
        display: true,
        sortable: true
      }
    ]
  }),
  created() {
    axios
      .get("https://jsonplaceholder.typicode.com/users")
      .then(result => {
        this.users = result.data;
      })
      .catch(err => {});
  }
};
</script>
