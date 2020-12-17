<template>
<div id="app">
    <VueyeTable :data="employees" :columns="columns" title="Employees">
        <template v-slot:header.cell.employee_salary="{columnDef}">
            <th style="background:#e3e3e3;color:#000;display:flex;">
                <span>{{columnDef.column.label}}</span>
                <span @click="columnDef.sorter.handler(columnDef.column)">
                    <h4 v-if="columnDef.sorter.column.direction==='asc'">&#8593;</h4>
                    <h4 v-else-if="columnDef.sorter.column.direction==='desc'">&#8595;</h4>
                    <h4 v-else>&#8593;</h4>
                </span>
            </th>
        </template>
        <template v-slot:cell.employee_salary="{item}">
            <td style="background:#e3e3e3;color:#000;">
                <b v-if="item.employee_salary>100000" style="background:#3bb640;color:white;padding:3px;border-radius:2px">{{item.employee_salary}}</b>
                <b v-else style="background:#ee4422;color:white;padding:3px;border-radius:2px">{{item.employee_salary}}</b>
            </td>
        </template>
        <template v-slot:header.cell.employee_name="{columnDef}">
            <th class="ve-table-custom-cell">{{columnDef.column.label}}</th>
        </template>
        <template v-slot:cell.employee_name="{item}">
            <td class="ve-table-custom-cell">{{item.employee_name}}</td>
        </template>
    </VueyeTable>
</div>
</template>

<script>
export default {
    name: "HeadCellCustomRendering",
    data: () => ({
        employees: [{
                "id": "1",
                "employee_name": "Tiger Nixon",
                "employee_salary": "320800",
                "employee_age": "61",
                "profile_image": "",
                "address": {
                    "street": "Kulas Light",
                    "suite": "Apt. 556",
                    "city": "Gwenborough",
                    "zipcode": "92998-3874",
                    "geo": {
                        "lat": "-37.3159",
                        "lng": "81.1496"
                    }
                }
            },
            {
                "id": "2",
                "employee_name": "Garrett Winters",
                "employee_salary": "170750",
                "employee_age": "63",
                "profile_image": "",
                "address": {
                    "street": "Victor Plains",
                    "suite": "Suite 879",
                    "city": "Wisokyburgh",
                    "zipcode": "90566-7771",
                    "geo": {
                        "lat": "-43.9509",
                        "lng": "-34.4618"
                    }
                }
            },
            {
                "id": "3",
                "employee_name": "Ashton Cox",
                "employee_salary": "86000",
                "employee_age": "66",
                "profile_image": "",
                "address": {
                    "street": "Douglas Extension",
                    "suite": "Suite 847",
                    "city": "McKenziehaven",
                    "zipcode": "59590-4157",
                    "geo": {
                        "lat": "-68.6102",
                        "lng": "-47.0653"
                    }
                }
            },
            {
                "id": "4",
                "employee_name": "Cedric Kelly",
                "employee_salary": "433060",
                "employee_age": "22",
                "profile_image": "",
                "address": {
                    "street": "Hoeger Mall",
                    "suite": "Apt. 692",
                    "city": "South Elvis",
                    "zipcode": "53919-4257",
                    "geo": {
                        "lat": "29.4572",
                        "lng": "-164.2990"
                    }
                }
            },
            {
                "id": "5",
                "employee_name": "Airi Satou",
                "employee_salary": "162700",
                "employee_age": "33",
                "profile_image": ""
            },
            {
                "id": "6",
                "employee_name": "Brielle Williamson",
                "employee_salary": "372000",
                "employee_age": "61",
                "profile_image": ""
            },
            {
                "id": "7",
                "employee_name": "Herrod Chandler",
                "employee_salary": "137500",
                "employee_age": "59",
                "profile_image": ""
            },
            {
                "id": "8",
                "employee_name": "Rhona Davidson",
                "employee_salary": "327900",
                "employee_age": "55",
                "profile_image": ""
            },
            {
                "id": "9",
                "employee_name": "Colleen Hurst",
                "employee_salary": "205500",
                "employee_age": "39",
                "profile_image": ""
            },
            {
                "id": "10",
                "employee_name": "Sonya Frost",
                "employee_salary": "103600",
                "employee_age": "23",
                "profile_image": ""
            },
            {
                "id": "11",
                "employee_name": "Jena Gaines",
                "employee_salary": "90560",
                "employee_age": "30",
                "profile_image": ""
            },
            {
                "id": "12",
                "employee_name": "Quinn Flynn",
                "employee_salary": "342000",
                "employee_age": "22",
                "profile_image": ""
            },
            {
                "id": "13",
                "employee_name": "Charde Marshall",
                "employee_salary": "470600",
                "employee_age": "36",
                "profile_image": ""
            },
            {
                "id": "14",
                "employee_name": "Haley Kennedy",
                "employee_salary": "313500",
                "employee_age": "43",
                "profile_image": ""
            },
            {
                "id": "15",
                "employee_name": "Tatyana Fitzpatrick",
                "employee_salary": "385750",
                "employee_age": "19",
                "profile_image": ""
            },
            {
                "id": "16",
                "employee_name": "Michael Silva",
                "employee_salary": "198500",
                "employee_age": "66",
                "profile_image": ""
            },
            {
                "id": "17",
                "employee_name": "Paul Byrd",
                "employee_salary": "725000",
                "employee_age": "64",
                "profile_image": ""
            },
            {
                "id": "18",
                "employee_name": "Gloria Little",
                "employee_salary": "237500",
                "employee_age": "59",
                "profile_image": ""
            },
            {
                "id": "19",
                "employee_name": "Bradley Greer",
                "employee_salary": "132000",
                "employee_age": "41",
                "profile_image": ""
            },
            {
                "id": "20",
                "employee_name": "Dai Rios",
                "employee_salary": "217500",
                "employee_age": "35",
                "profile_image": ""
            },
            {
                "id": "21",
                "employee_name": "Jenette Caldwell",
                "employee_salary": "345000",
                "employee_age": "30",
                "profile_image": ""
            },
            {
                "id": "22",
                "employee_name": "Yuri Berry",
                "employee_salary": "675000",
                "employee_age": "40",
                "profile_image": ""
            },
            {
                "id": "23",
                "employee_name": "Caesar Vance",
                "employee_salary": "106450",
                "employee_age": "21",
                "profile_image": ""
            },
            {
                "id": "24",
                "employee_name": "Doris Wilder",
                "employee_salary": "85600",
                "employee_age": "23",
                "profile_image": ""
            }
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
    methods: {}
};
</script>

<style lang="scss">
.ve-table-custom-cell {
    background: rgb(30, 118, 233);
    color: white;
}
</style>
