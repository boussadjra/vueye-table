<template>
<div>
    <div class="desc">
        <div class="section__title">
            Select rows
        </div>

        <p class="p-2 text-sm">
        </p>
        <tab-view :items=" items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50 ">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="users" :columns="columns" select-rows v-model="selectedUsers" title="Users"></VueyeTable>
        </div>
    </div>

    <hr>
    <div class="max-h-96">
        <prism language="javascript">
            {{selectedUsers}}
        </prism>
    </div>
</div>
</template>

<script>
import axios from "axios";
import snippets from "@/utils/snippets";
export default {
    name: "SelectRows",
    data: () => ({
        code: snippets.selectRows,
        showCode: false,
        items: [{
                header: "Preview",
            },
            {
                header: "Code",
            },
        ],
        users: [],
        selectedUsers: [],
        columns: [{
                key: "id",
                label: "ID",
                sortable: true,
                type: "number",
                display: true
            },
            {
                key: "name",
                label: "Name",
                sortable: true,
                display: true
            },
            {
                key: "username",
                label: "User name",
                sortable: true,
                display: true
            },

            {
                key: "address.city",
                label: "City",
                display: true,
                sortable: true
            }
        ]
    }),
    methods: {
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
    },
    created() {
        axios
            .get("https://jsonplaceholder.typicode.com/users")
            .then(result => {
                this.users = result.data;
            })
            .catch(err => {});
    }
};
</script>
