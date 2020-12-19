<template>
<div>
    <div class="desc">
        <div class="section__title">
            Expand rows
        </div>

        <p class="p-2 text-sm">

        </p>
        <tab-view :items=" items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50 ">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="employees" :columns="columns" title="Employees">
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
    </div>
</div>
</template>

<script>
import employees from "@/data/employees.js";
import snippets from '@/utils/snippets';
export default {
    name: "ExpandRows",
    data: () => ({
        code: snippets.expandRows,
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
            }
        ]
    }),
    computed: {
        employees() {
            return employees.slice();
        }
    },
    methods: {
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
        getMoreDetails(id) {
            return this.employees.find(emp => emp.id === id);
        }
    },
    mounted() {

    },
};
</script>
