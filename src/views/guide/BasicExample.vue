<template>
<div>
    <div class="desc">
        <div class="section__title">Table with header</div>

        <p class="p-2 text-sm">
            To get a basic usage of this data table try to give false to header-display prop
        </p>
        <tab-view :items="items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="employees" :columns="columns" title="Employees">
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
        code: snippets.withHeader,
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
        ],
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
    },
    mounted() {},
};
</script>
