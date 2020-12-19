<template>
<div>
    <div class="desc">
        <div class="section__title">Table body cells custom rendering</div>

        <p class="p-2 text-sm">
            If you want to take the control over the whole cell you can prefix the
            <code class="bg-green-100 text-green-700 p-1">column</code>key with <code class="bg-green-100 text-green-700 p-1">cell.</code>keyword and here you're able to style and
            render the <code class="bg-green-100 text-green-700 p-1">td</code>element as you want Note that you should add
            <code class="bg-green-100 text-green-700 p-1">data-label</code>attribute with column name, this's useful for small screens
        </p>
        <tab-view :items="items" @change-tab="changeTab"></tab-view>
        <div class="p-4 bg-green-50">
            <div v-if="showCode">
                <prism language="html">{{ code }}</prism>
            </div>
            <VueyeTable :data="todos" :columns="columns" title="Todos">
                <template v-slot:cell.completed="{ item }">
                    <td :style="{ background: colors[item.userId - 1], color: 'white' }" data-label="Completed">
                        {{ item.userId }}
                    </td>
                </template>
                <template v-slot:completed="{ item }">{{
            item.completed ? "Yes" : "No"
          }}</template>
            </VueyeTable>
        </div>
    </div>
</div>
</template>

<script>
import todos from "@/data/todos.js";
import snippets from "@/utils/snippets";
export default {
    name: "FullCellCustomRendering",
    data: () => ({
        code: snippets.fullCellCustomRendering,
        showCode: false,
        items: [{
                header: "Preview",
            },
            {
                header: "Code",
            },
        ],

        todos,
        columns: [{
                key: "id",
                label: "ID",
                sortable: true,
                display: true,
            },
            {
                key: "userId",
                label: "User ID",
                sortable: true,
                display: true,
            },
            {
                key: "title",
                label: "Title",
                display: true,
            },
            {
                key: "completed",
                label: "Completed",
                display: true,
            },
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
