export default {
	BasicExample: `
    <template>
    <div>
      <VueyeTable :header-display="false" :data="employees" :columns="columns" title="Employees">
      </VueyeTable>
    </div>
    </template>
    <script>
    import employees from "@/data/employees.js";
    import VueyeTable from 'vueye-table'
    export default {
        name: "BasicExample",
        data: () => ({
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
        components:{
            VueyeTable
        }
       
    };
    </script>
    `,

	home: `<template>
    <div id="app">
        <VueyeTable :data="employees" :columns="columns" title="Employees" filter-by="employee_salary">
            <template v-slot:employee_salary="{item}">
                <b v-if="item.employee_salary>100000" class="bg-green-600 text-green-50 p-1 rounded">{{item.employee_salary}}</b>
                <b v-else class="bg-red-600 text-red-50 p-1 rounded">{{item.employee_salary}}</b>
            </template>
            <template v-slot:actions="{item}">
                <div class="flex space-x-2">
                    <button class="bg-indigo-600 text-gray-100 py-1 px-4 rounded" @click="edit(item)">Edit</button>
                    <button class="bg-red-700 text-gray-100 py-1 px-4 rounded" @click="deleteItem(item)">Delete</button>
                </div>
            </template>
        </VueyeTable>
    </div>
    </template>
    
    <script>
    import VueyeTable from "vueye-table";
    import employees from "@/assets/employees.json";
    export default {
        name: "App",
        data: () => ({
            employees: employees,
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
            selectedRows: []
        }),
        methods: {
            edit(item) {
                //open a dialog to edit the selected item
                //or redirect to another page that contains
                // edit form
            },
            deleteItem(item) {
                this.employees = this.employees.filter(
                    employee => employee.id !== item.id
                );
            }
        },
        components: {
            VueyeTable
        }
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
    `,
	withHeader: `<template>
    <VueyeTable 
       :data="employees" 
       :columns="columns"
        title="Employees">
        </VueyeTable>
  </template>
  
  <script>
  import employees from "../assets/employees.js";
  export default {
    name: "WithHeader",
    data: () => ({
      employees: employees,
      columns: [
        {
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
    })
  };
  </script>
  `,
	CRUDActions: `<template>
  <div id="app">
    <VueyeTable :data="employees" :columns="columns" title="Employees" :config="config">
      
      <template v-slot:actions="{item}">
        <div class="ve-table-actions">
          <button class="ve-table-btn ve-table-btn-primary" @click="edit(item)">Edit</button>
          <button class="ve-table-btn ve-table-btn-danger" @click="deleteItem(item)">Delete</button>
        </div>
      </template>
    </VueyeTable>
  </div>
</template>

<script>
import employees from "../assets/employees.js";
export default {
  name: "App",
  data: () => ({
    employees: employees,
    columns: [
      {
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
      of: "de"
    }
  }),
  methods: {
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
  components: {
  }
};
</script>`,

	customRendering: `<template>
<div id="app">
  <VueyeTable :data="users" :columns="columns" title="Github users">
    <template v-slot:avatar_url="{item}">
      <img :src="item.avatar_url" alt class="ve-avatar">
    </template>
    <template v-slot:html_url="{item}">
      <a target="_blank"  :href="item.html_url">{{item.html_url}}</a>
      
    </template>
  </VueyeTable>
</div>
</template>

<script>
import users from "../assets/github_users.js";
export default {
name: "CustomRendering",
data: () => ({
  users,
  columns: [
    {
      key: "avatar_url",
      label: "Avatar",
      sortable: true,
      display: true
    },
    {
      key: "login",
      label: "User name",
      sortable: true,
      display: true
    },
    {
      key: "html_url",
      label: "Profile",
      display: true
    }
  ],
})
};
</script>

<style lang="scss">
.ve-avatar {
height: 32px;
width: 32px;
border-radius: 50%;
border: thin solid #aaa;
}
</style>
`,
	fullCellCustomRendering: `<template>
<div id="app">
  <VueyeTable :data="todos" :columns="columns" title="Todos">
    <template v-slot:cell.completed="{item}">
      <td :style="{'background':colors[item.userId-1],'color':'white'}" data-label="Completed">{{item.userId}}</td>
    </template>
    <template v-slot:completed="{item}">{{item.completed?'Yes':'No'}}</template>
  </VueyeTable>
</div>
</template>

<script>
import todos from "../assets/todos.js";

export default {
name: "FullCellCustomRendering",
data: () => ({
  todos,
  columns: [
    {
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
  //we have 10 users and each one is defined by color, that color will be shown in the
  //custom cells
  colors: [
    "#004D40",
    "#00695C",
    "#2e003e",
    "#3d2352",
    "#05386B",
    "#379683",
    "#022140",
    "#265077",
    "#0c0023",
    "#fc0023",
  ]
})
};
</script>

<style lang="scss">
.ve-avatar {
height: 32px;
width: 32px;
border-radius: 50%;
border: thin solid #aaa;
}
</style>
`,
	headCustomRendering: `<template>
<div id="app">
  <VueyeTable :data="users" :columns="columns" title="Github users">
    <template v-slot:header.avatar_url="{column}">
      {{column.label}} <i>(The user profile image)</i> 
    </template>
     <template v-slot:header.html_url="{column}">
      {{column.label}} <i>(Link to the user profile)</i> 
    </template>
    <template v-slot:avatar_url="{item}">
      <img :src="item.avatar_url" alt class="ve-avatar">
    </template>
    <template v-slot:html_url="{item}">
      <a target="_blank"  :href="item.html_url">{{item.html_url}}</a>
      
    </template>
  </VueyeTable>
</div>
</template>

<script>
import users from "../assets/github_users.js";
export default {
name: "HeadCustomRendering",
data: () => ({
  users,
  columns: [
    {
      key: "avatar_url",
      label: "Avatar",
      sortable: true,
      display: true
    },
    {
      key: "login",
      label: "User name",
      sortable: true,
      display: true
    },
    {
      key: "html_url",
      label: "Profile",
      display: true
    }
  ],
})
};
</script>

<style lang="scss">
.ve-avatar {
height: 32px;
width: 32px;
border-radius: 50%;
border: thin solid #aaa;
}
</style>
`,
	headCellCustomRendering: `<template>
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
        <b
          v-if="item.employee_salary>100000"
          style="background:#3bb640;color:white;padding:3px;border-radius:2px"
        >{{item.employee_salary}}</b>
        <b
          v-else
          style="background:#ee4422;color:white;padding:3px;border-radius:2px"
        >{{item.employee_salary}}</b>
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
import employees from "../assets/employees.js";
export default {
name: "HeadCellCustomRendering",
data: () => ({
  employees: employees,
  columns: [
    {
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
`,
	expandRows: `<template>
<div>
  <VueyeTable :data="employees" :columns="columns" title="Employees">
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
</template>

<script>
import employees from "../assets/employees.js";
export default {
name: "App",
data: () => ({
  employees: employees,
  columns: [
    {
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
  ]
}),
methods: {
  getMoreDetails(id) {
    return this.employees.find(emp => emp.id === id);
  }
}
};
</script>
`,
	selectRows: `<template>
<div>
  <VueyeTable
    :data="users"
    :columns="columns"
    select-rows
    v-model="selectedUsers"
    title="Users"
  ></VueyeTable>

  <hr />
  <pre class="language-js">
  {{ selectedUsers }}
  </pre>
</div>
</template>

<script>
import axios from "axios";
export default {
name: "SelectRows",
data: () => ({
  users: [],
  selectedUsers: [],
  columns: [
    {
      key: "id",
      label: "ID",
      sortable: true,
      type: "number",
      display: true,
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      display: true,
    },
    {
      key: "username",
      label: "User name",
      sortable: true,
      display: true,
    },

    {
      key: "address.city",
      label: "City",
      display: true,
      sortable: true,
    },
  ],
}),
created() {
  axios
    .get("https://jsonplaceholder.typicode.com/users")
    .then((result) => {
      this.users = result.data;
    })
    .catch((err) => {});
},
};
</script>
`,
	configDefaultLabels: `<template>
<VueyeTable
  :data="employees"
  :columns="columns"
  title="Employees"
  :config="config"
>
</VueyeTable>
</template>

<script>
import employees from "../assets/employees.js";
export default {
name: "ConfigDefaultLabels",
data: () => ({
  employees: employees,
  config: {
    filterBy: "Chercher par",
    search: "Chercher",
    nbRowsPerPage: "Nombre des lignes par page",
    of: "de",
  },
  columns: [
    {
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
};
</script>


`,
ServerPagination:`<template>
<div id="app">
  <VueyeTable
    :data="answers"
    :columns="columns"
    title="answers"
    :server="serverRequest"
    @update-request="updateRequest"
  >
    <template v-slot:title="{ item }">
      <a :href="item.link" target="_blank" rel="noopener noreferrer">
        {{ item.title }}
      </a>
    </template>
    <template v-slot:score="{ item }">
      <h3
        :style="{ color: item.is_accepted ? '#4d4' : '#777' }"
        v-if="item.score"
      >
        +
        <span>{{
          item.is_accepted ? item.score * 10 + 15 : item.score * 10
        }}</span>
      </h3>
    </template>
    <template v-slot:creation_date="{ item }">
      <span>{{
        new Date(Number(item.creation_date + "000")).toDateString()
      }}</span>
    </template>
  </VueyeTable>
</div>
</template>

<script>
import axios from "axios";
export default {
name: "App",
data: () => ({
  answers: [],
  columns: [
    {
      key: "answer_id",
      label: "ID",
      sortable: true,
      type: "number",
      display: true,
    },
    {
      key: "title",
      label: "Title",
      sortable: true,
      display: true,
    },
    {
      key: "score",
      label: "Score",
      display: true,
      sortable: true,
    },
    {
      key: "creation_date",
      label: "Date",
      sortable: true,
      display: true,
    },
    {
      key: "is_accepted",
      label: "Accepted",
      sortable: true,
    },
    {
      key: "link",
      label: "Link",
      sortable: true,
    },
  ],

  serverRequest: {
    total: null,
    perPage: 10,
    page: 1,
  },
}),
methods: {
  updateRequest(page, perPage) {
    this.serverRequest = { ...this.serverRequest, page, perPage };

    this.getData();
  },
  getData() {
    axios
      .get(
        'https://api.stackexchange.com/2.2/users/8172857/answers?page='+this.serverRequest.page}&pagesize='+'this.serverRequest.perPage+&order=desc&sort=activity&site=stackoverflow&filter=!)sAFO_2))PMwRocnks3p'-bottom-0'
      )
      .then((result) => {
        this.answers = result.data.items;

        this.serverRequest.total = result.data.total;
        this.serverRequest.perPage = result.data.page_size;
        this.serverRequest.page = result.data.page;
      })
      .catch((err) => {});
  },
},

created() {
  // this.getData();
},
};
</script>

<style lang="scss">
#app {
display: flex;
justify-content: center;
align-items: center;
padding: 24px;
box-shadow: 0 0 2px #aaa;
}
</style>
`
};
