<template>
<div>
    <div class="desc">
        <div class="section__title">
            Server Side pagination
        </div>

        <p class="p-2 text-sm">
            in order to go to the next/previous page or change per page value, the table component should emit an event called @update-request and its handler has two parameters page and perPage, then the method will update the server request and fires an AJAX call to fetch the data based on the previous parameter
        </p>

        <div class="my-4 py-2 text-gray-600 border-l-8 border-green-700 px-4 bg-green-100">
            <h1 class="text-2xl font-bold py-1">TIP</h1>

            <p p-2 text-sm>you don't need to call the method that fetch data in the mounted or created hooks because is called when the page changes which means that the method is called for the first rendering</p>
        </div>
        <tab-view :items=" items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50 ">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable v-else :data="answers" :columns="columns" title="answers" :server="serverRequest" @update-request="updateRequest">
                <template v-slot:title="{ item }">
                    <a :href="item.link" target="_blank" rel="noopener noreferrer">
                        {{ item.title }}
                    </a>
                </template>
                <template v-slot:score="{ item }">
                    <h3 :style="{ color: item.is_accepted ? '#4d4' : '#777' }" v-if="item.score">
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
    </div>
</div>
</template>

<script>
import axios from "axios";
import snippets from '@/utils/snippets';
export default {
    name: "ServerPagination",
    data: () => ({
        code: snippets.serverPagination,
        showCode: false,
        items: [{
                header: "Preview",
            },
            {
                header: "Code",
            },

        ],

        answers: [],
        columns: [{
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
        changeTab(item) {
            this.showCode = item.header === "Code";
        },
        updateRequest(page, perPage) {
            this.serverRequest = {
                ...this.serverRequest,
                page,
                perPage
            };

            this.getData();
        },
        getData() {
            axios
                .get(
                    `https://api.stackexchange.com/2.2/users/8172857/answers?page=${this.serverRequest.page}&pagesize=${this.serverRequest.perPage}&order=desc&sort=activity&site=stackoverflow&filter=!)sAFO_2))PMwRocnks3p`
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
    mounted() {

    },
};
</script>
