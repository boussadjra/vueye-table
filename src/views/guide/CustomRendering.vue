<template>
<div>
    <div class="desc">
        <div class="section__title">Table body custom rendering</div>

        <p class="p-2 text-sm">
            You could get the current row item on which you could apply some logic/style
        </p>
        <tab-view :items="items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="github_users" :columns="columns" title="Github users">
                <template v-slot:avatar_url="{item}">
                    <img :src="item.avatar_url" alt class="ve-avatar h-10 w-10 rounded-full">
                </template>
                <template v-slot:html_url="{item}">
                    <a target="_blank" class="text-blue-600 " :href="item.html_url">{{item.html_url}}</a>

                </template>
            </VueyeTable>
        </div>
    </div>
</div>
</template>

<script>
import github_users from "@/data/github_users";
import snippets from "@/utils/snippets";
export default {
    name: "CustomRendering",
    data: () => ({
        code: snippets.customRendering,
        showCode: false,
        items: [{
                header: "Preview",
            },
            {
                header: "Code",
            },
        ],
        github_users,
        columns: [{
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
    }),

    methods: {
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
    },
    mounted() {},
};
</script>
