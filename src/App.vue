<template>
<div class="main-page">
  
    <div class="logo"></div>
    
    <div class="main-container">
         <h2>Bordered table with blue theme</h2>
  
        <vueye-table theme-name="blue-1" checkable :per-page-values="[5,10,25,50]" title="Utilisateurs" vLang="fr" show-theme :rows_data="user_data"  v-on:checked-rows="getChecked"></vueye-table>
    </div>
       <div class="main-container">
         <h2>Striped table with dark theme</h2>
        <vueye-table title="Todos"  theme-name="dark-1" table-style="striped" show-theme :rows_data="todo_data"  v-on:checked-rows="getChecked"></vueye-table>
    </div>
          <div class="main-container" dir="rtl">
         <h2>جدول الموظفين</h2>
        <vueye-table title="الموظفون" vLang="ar" theme-name="dark-2" table-style="striped" show-theme :rows_data="emps_data"  v-on:checked-rows="getChecked"></vueye-table>
    </div>
    
</div>
</template>

<script>
import VueyeTable from "./components/VueyeTable.vue";
import todos from "./assets/todos.json";
import users from "./assets/users.json";
import emps from "./assets/emps.json";
export default {
  name: "app",
  data() {
    return {
      todo_attr: ["todoId", "id", "title", "completed"],
      todo_data: [],
      user_attr: ["id", "name", "phone"],
      user_data: [],
      emps_data: []
    };
  },
  components: {
    VueyeTable
  },
  methods: {
    getChecked(rows) {
      console.log(rows);
    }
  },
  mounted() {
    // console.log("app is mounted")
    this.todo_data = todos;
    this.user_data = users;
    this.emps_data = emps;
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
  font-family: Comforta;
  background: #efeff0;
  height: 100%;
  margin: 0;
  font-size: 12pt;
}
h2 {
  color: #444;
}

.main-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.main-container {
  width: 95%;
  height: auto;
  margin: 30px;
}

.logo {
  background-image: url(https://raw.githubusercontent.com/boussadjra/vueye-table/master/src/assets/vueye.png);
  width: 150px;
  height: 125px;
  background-repeat: no-repeat;
  background-size: cover;
  margin: 10px;
}
</style>
