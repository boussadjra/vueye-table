<template>
<div class="flex flex-col p-4 overflow-y-auto max-h-screen-lg text-gray-700">
    <div class="py-2 px-8">

        <div class="py-4 space-y-4">

            <p>
            <h1 class="text-3xl text-gray-700 font-bold ">
                Vueye table :
            </h1>
            <h2 class="text-2xl text-gray-600 font-semibold pb-2 pl-1">
                Description
            </h2>

            <span class="text-lg text-gray-700 pl-2"> It's a data table created using Vue.js, which has some features like :</span>

            <ol class="flex flex-col space-y-1 p-1 text-md text-gray-600 list-decimal pl-8 pt-4 list-group-item">

                <li> Show data per page </li>
                <li> Sort columns </li>
                <li> Cells Custom rendering </li>
                <li> CRUD Actions </li>
                <li> Customize the columns display </li>
                <li> Filter data by fields </li>
            </ol>
            </p>

            <h2 class="text-2xl text-gray-600 font-semibold pb-2 pl-1">
                Installation :
            </h2>

            <prism language="javascript">npm install vueye-table --save</prism>

            <h2 class="text-2xl text-gray-600 font-semibold pb-2 pl-1">
                Requirements :
            </h2>
            <p class="pl-4">
                To make this component work with Vue 2, you should use the Vue composition-api plugin by importing it and using it in <span class="bg-green-100 text-green-700">main.js</span> as follows :

            </p>
            <prism language="javascript" class="whitespace-pre ">
                {{mainjs}}
            </prism>

            <h2 class="text-2xl text-gray-600 font-semibold pb-2 pl-1">
                Columns configuration:
            </h2>
            <p class="pl-4">
                The <span class="bg-green-100 text-green-700"> columns</span> prop value could have the following structure :
            </p>
            <prism language="javascript" class="whitespace-pre ">
                {{columnsConfig}}
            </prism>
            <div class="">
                <VueyeTable bordered :header-display="false" :data="colConfigProperties" :columns="colConfigFields" title="col">
                </VueyeTable>
            </div>
        </div>

    </div>

    <tab-view :items="items" @change-tab="changeTab"></tab-view>
    <div class="p-4 bg-green-50 px-20"></div>
    <div v-if="showCode">
        <prism language="html">{{ code }}</prism>
    </div>
    <div v-else>

        <VueyeTable :data="employees" :columns="columns" title="Employees" filter-by="employee_salary">
            <template v-slot:employee_salary="{ item }">
                <b v-if="item.employee_salary > 100000" class="bg-green-600 text-green-50 p-1 rounded">{{ item.employee_salary }}</b>
                <b v-else class="bg-red-600 text-red-50 p-1 rounded">{{
          item.employee_salary
        }}</b>
            </template>
            <template v-slot:actions="{ item }">
                <div class="flex space-x-2">
                    <button class="bg-indigo-600 text-gray-100 py-1 px-4 rounded" @click="edit(item)">
                        Edit
                    </button>
                    <button class="bg-red-700 text-gray-100 py-1 px-4 rounded" @click="deleteItem(item)">
                        Delete
                    </button>
                </div>
            </template>
        </VueyeTable>
    </div>

</div>
</template>

<script>
import VueyeTable from "@/components/VueyeTable.vue";
import employees from "@/assets/employees.json";
import todos from '@/data/todos'
import snippets from "@/utils/snippets";
import TabView from "@/devComponents/navigation/TabView.vue";

export default {
    name: "App",
    data: () => ({
        employees: employees,
        code: snippets.BasicExample,
        showCode: false,
        todos,
        mainjs: `import Vue from 'vue';
import App from './App.vue';
import VueComp from '@vue/composition-api';

Vue.use(VueComp);

new Vue({
	render: h => h(App),
}).$mount('#app');`,

        columnsConfig: ` columns: [
      {
        key: "id",
        label: "ID",
        sortable: true,
        type: "number",
        display: true
      },
      ...
 ]`,
        todoCols: [{
                key: "id",
                label: "ID",
                sortable: true,
                display: true
            },
            {
                key: "userId",
                label: "User ID",
                sortable: true,
                display: true
            },
            {
                key: "title",
                label: "Title",
                display: true
            },
            {
                key: "completed",
                label: "Completed",
                display: true
            }
        ],
        colConfigProperties: [{
                key: "key",
                desc: "the corresponding field in the data array, it could be a path to a nested field",
            },
            {
                key: "label",
                desc: "the text to show in the table head",
            },
            {
                key: "sortable",
                desc: "Allow or not the column sorting",
            },
            {
                key: "type",
                desc: "the field type",
            },
            {
                key: "display",
                desc: "show the column",
            },
        ],
        colConfigFields: [{
                key: "key",
                label: "Key",

                display: true,
            },
            {
                key: "desc",
                label: "Description",
                display: true,
            },
        ],
        items: [{
                header: "Preview",
                // body: "lorem ipsum 1",
            },
            {
                header: "Code",
                // body: "lorem ipsum",
            },
        ],
        columns: [{
                key: "id",
                label: "ID",
                sortable: true,
                type: "number",
                display: true,
            },
            {
                key: "employee_name",
                label: "Employee Name",
                sortable: true,
                display: true,
            },
            {
                key: "employee_salary",
                label: "Employee Salary",
                display: true,
                sortable: true,
            },
            {
                key: "employee_age",
                label: "Employee Age",
                sortable: true,
            },
            {
                key: "address.city",
                label: "Address",
                display: true,
                sortable: true,
            },
            {
                key: "actions",
                label: "Actions",
                sortable: false,
                display: true,
            },
        ],
        selectedRows: [],
    }),
    methods: {
        edit(item) {
            //open a dialog to edit the selected item
            //or redirect to another page that contains
            // edit form
        },
        deleteItem(item) {
            this.employees = this.employees.filter(
                (employee) => employee.id !== item.id
            );
        },
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
    },
    components: {
        VueyeTable,
        TabView,
    },
};
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
