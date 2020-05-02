<template>
<div id="app">
    <VueyeTable :data='users' :columns='columns' title="My Table" sort-by="name"/>
</div>
</template>

<script>
import VueyeTable from './components/VueyeTable.vue'
import users from './assets/users.json'
export default {
    name: 'App',
    data: () => ({
        users,
        columns: [{
                key: "id",
                label: "ID",
                sortable: true,
                type: 'number'
            },
            {
                key: "name",
                label: "Name",
                sortable: true
            },
            {
                key: "username",
                label: "User Name",
                sortable: true
            },
            {
                key: "email",
                label: "Email",
            

            }, {
                key: "address.city",
                label: "City",
                sortable: true
             

            }
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
