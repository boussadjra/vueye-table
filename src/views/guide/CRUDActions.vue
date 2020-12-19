<template>
<div>
    <div class="desc">
        <div class="section__title">Table with header</div>

        <p class="p-2 text-sm">
            The table header contains the title, search input and the export and
            print buttons
        </p>
        <tab-view :items="items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="employees" :columns="columns" title="Employees" :config="config">

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
    </div>
</div>
</template>

<script>
import employees from "@/data/employees.js";
import snippets from "@/utils/snippets";
export default {
    name: "BasicExample",
    data: () => ({
        code: snippets.CRUDActions,
        showCode: false,
        items: [{
                header: "Preview",
            },
            {
                header: "Code",
            },
        ],

        columns: [{
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
            of: "de",
        },
    }),
    computed: {
        employees() {
            return employees.slice();
        },
    },
    methods: {
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
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
};
</script>
