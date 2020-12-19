<template>
<div>
    <div class="desc">
        <div class="section__title">Table cell head custom rendering</div>

        <p class="p-2 text-sm">
            You could be able to customize the full head cell of given column (not just the label), to make this you have access to a property called <code class="bg-green-100 text-green-700 p-1">columnDef</code>which contains <code class="bg-green-100 text-green-700 p-1">column</code>and the <code class="bg-green-100 text-green-700 p-1">sorter</code>that has the following fields:

            1 - <code class="bg-green-100 text-green-700 p-1">handler</code>this function is used to sort the given column which should be passed as parameter
            2 - <code class="bg-green-100 text-green-700 p-1">column.direction</code>the sort direction, by default its value is <code class="bg-green-100 text-green-700 p-1">none</code>if you click in the sort icon this passes to <code class="bg-green-100 text-green-700 p-1">asc</code>, then to <code class="bg-green-100 text-green-700 p-1">desc</code>, if you click again it comes back to <code class="bg-green-100 text-green-700 p-1">none</code>and so on.
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
    name: "HeadCellCustomRendering",
    data: () => ({
        code: snippets.headCellCustomRendering,
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
