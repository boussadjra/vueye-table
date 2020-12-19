<template>
<div>
    <div class="desc">
        <div class="section__title">Table head custom rendering</div>

        <p class="p-2 text-sm">
            You could also customize the <code class="bg-green-100 text-green-700 p-1">column</code> label in the table head.

        </p>
        <tab-view :items="items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="employees" :columns="columns" title="Employees">
                <template v-slot:header.cell.employee_salary="{ columnDef }">
                    <th style="background: #e3e3e3; color: #000; display: flex">
                        <span>{{ columnDef.column.label }}</span>
                        <span @click="columnDef.sorter.handler(columnDef.column)">
                            <h4 v-if="columnDef.sorter.column.direction === 'asc'">
                                &#8593;
                            </h4>
                            <h4 v-else-if="columnDef.sorter.column.direction === 'desc'">
                                &#8595;
                            </h4>
                            <h4 v-else>&#8593;</h4>
                        </span>
                    </th>
                </template>
                <template v-slot:cell.employee_salary="{ item }">
                    <td style="background: #e3e3e3; color: #000">
                        <b v-if="item.employee_salary > 100000" style="
                  background: #3bb640;
                  color: white;
                  padding: 3px;
                  border-radius: 2px;
                ">{{ item.employee_salary }}</b>
                        <b v-else style="
                  background: #ee4422;
                  color: white;
                  padding: 3px;
                  border-radius: 2px;
                ">{{ item.employee_salary }}</b>
                    </td>
                </template>
                <template v-slot:header.cell.employee_name="{ columnDef }">
                    <th class="ve-table-custom-cell">{{ columnDef.column.label }}</th>
                </template>
                <template v-slot:cell.employee_name="{ item }">
                    <td class="ve-table-custom-cell">{{ item.employee_name }}</td>
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
    name: "HeadCustomRendering",
    data: () => ({
        code: snippets.headCustomRendering,
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
