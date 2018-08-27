<template>
<div class="main-page">
    <!-- <h1 style="font-family:futura">Vueye Table</h1> -->
  <img src="assets/vueye.png" alt="" srcset="" height="122" width="160">
    <div class="main-container">
        <vueye-table title="Users" show-theme :rows_data="user_data"  v-on:checked-rows="getChecked"></vueye-table>
    </div>
</div>
</template>

<script>
import VueyeTable from "./components/VueyeTable.vue";
import todos from "./assets/todos.json";
import users from "./assets/users.json";
export default {
  name: "app",
  data() {
    return {
      todo_attr: ["todoId", "id", "title", "completed"],
      todo_data: [],
      user_attr: ["id", "name", "phone"],
      user_data: []
    };
  },
  components: {
    VueyeTable
  },
  methods: {
   
    getChecked(rows){
      console.log(rows);

    }
  },
  mounted() {
    // console.log("app is mounted")
    this.todo_data = todos;
    this.user_data = users;

    /*this.axios.get('https://jsonplaceholder.typicode.com/todos').then((response) => {
        //console.log(response.data)
    this.todo_data=response.data;
    }).catch((err) =>{console.log(err)});*/
  }
};
</script>

<style lang="scss">
body {
  font-family: Arial, Helvetica, sans-serif;
  background: #dbeae5;
  height: 100vh;
  margin: 0;
  font-size: 12pt;
}

.main-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.main-container {
  width: 95%;
  height: 85vh;
  
}
</style>
