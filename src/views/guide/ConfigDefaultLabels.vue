<template>
<div>
    <div class="desc">
        <div class="section__title">Select rows</div>

        <p class="p-2 text-sm"></p>
        <tab-view :items="items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="employees" :columns="columns" title="Employees" :config="config">
            </VueyeTable>
        </div>
    </div>
</div>
</template>

<script>
import employees from "@/data/employees.js";

import snippets from "@/utils/snippets";
export default {
    name: "ConfigDefaultLabels",
    data: () => ({
        code: snippets.configDefaultLabels,
        showCode: false,
        items: [{
                header: "Preview",
            },
            {
                header: "Code",
            },
        ],
        employees: employees,
        config: {
            filterBy: "Chercher par",
            search: "Chercher",
            nbRowsPerPage: "Nombre des lignes par page",
            of: "de",
        },
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
    methods: {
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
    },
};
</script>
