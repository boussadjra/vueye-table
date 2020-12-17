<template>
<div id="app">
    <VueyeTable :data="users" :columns="columns" title="Github users">
        <template v-slot:avatar_url="{ item }">
            <img :src="item.avatar_url" alt class="ve-avatar" />
        </template>
        <template v-slot:html_url="{ item }">
            <a target="_blank" :href="item.html_url">{{ item.html_url }}</a>
        </template>
    </VueyeTable>
</div>
</template>

<script>
export default {
    name: "CustomRendering",
    data: () => ({
        users: [{
                login: "boussadjra",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801238?v=4",
                html_url: "https://github.com/boussadjra",
            },
            {
                login: "BenedictSh",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801239?v=4",
                html_url: "https://github.com/BenedictSh",
            },
            {
                login: "john17p5vdoblog",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801240?v=4",
                html_url: "https://github.com/john17p5vdoblog",
            },
            {
                login: "theolau",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801242?v=4",
                html_url: "https://github.com/theolau",
            },
            {
                login: "philonn",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801243?v=4",
                html_url: "https://github.com/philonn",
            },
            {
                login: "yashpote",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801244?v=4",
                html_url: "https://github.com/yashpote",
            },
            {
                login: "r4t4",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801245?v=4",
                html_url: "https://github.com/r4t4",
            },
            {
                login: "Nisarg2212",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801246?v=4",
                html_url: "https://github.com/Nisarg2212",
            },
            {
                login: "victoria1000",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801247?v=4",
                html_url: "https://github.com/victoria1000",
            },
            {
                login: "jlires",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801248?v=4",
                html_url: "https://github.com/jlires",
            },
            {
                login: "regiawan",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801249?v=4",
                html_url: "https://github.com/regiawan",
            },
            {
                login: "cuzitsjonny",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801250?v=4",
                html_url: "https://github.com/cuzitsjonny",
            },
            {
                login: "marinamichal",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801251?v=4",
                html_url: "https://github.com/marinamichal",
            },
            {
                login: "skalerlabs",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801252?v=4",
                html_url: "https://github.com/skalerlabs",
            },
            {
                login: "moullo",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801253?v=4",
                html_url: "https://github.com/moullo",
            },
            {
                login: "avagp",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801254?v=4",
                html_url: "https://github.com/avagp",
            },
            {
                login: "baha1976",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801255?v=4",
                html_url: "https://github.com/baha1976",
            },
            {
                login: "dimitripascoal",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801256?v=4",
                html_url: "https://github.com/dimitripascoal",
            },
            {
                login: "Manasvini-BS",
                avatar_url: "https://avatars3.githubusercontent.com/u/11801257?v=4",
                html_url: "https://github.com/Manasvini-BS",
            },
            {
                login: "sdsmt-robotics-odroids",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801258?v=4",
                html_url: "https://github.com/sdsmt-robotics-odroids",
            },
            {
                login: "LurdexxR",
                avatar_url: "https://avatars2.githubusercontent.com/u/11801259?v=4",
                html_url: "https://github.com/LurdexxR",
            },
            {
                login: "kaveet",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801260?v=4",
                html_url: "https://github.com/kaveet",
            },
            {
                login: "innospace13",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801261?v=4",
                html_url: "https://github.com/innospace13",
            },
            {
                login: "nontonfilm",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801262?v=4",
                html_url: "https://github.com/nontonfilm",
            },
            {
                login: "54mlkjzdq",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801263?v=4",
                html_url: "https://github.com/54mlkjzdq",
            },
            {
                login: "g1077600",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801264?v=4",
                html_url: "https://github.com/g1077600",
            },
            {
                login: "Joshua297a",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801265?v=4",
                html_url: "https://github.com/Joshua297a",
            },
            {
                login: "jakdanielz",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801266?v=4",
                html_url: "https://github.com/jakdanielz",
            },
            {
                login: "Bkhunneman",
                avatar_url: "https://avatars1.githubusercontent.com/u/11801267?v=4",
                html_url: "https://github.com/Bkhunneman",
            },
            {
                login: "salmahnana",
                avatar_url: "https://avatars0.githubusercontent.com/u/11801268?v=4",
                html_url: "https://github.com/salmahnana",
            },
        ],
        columns: [{
                key: "avatar_url",
                label: "Avatar",
                sortable: true,
                display: true,
            },
            {
                key: "login",
                label: "User name",
                sortable: true,
                display: true,
            },
            {
                key: "html_url",
                label: "Profile",
                display: true,
            },
        ],
    }),
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
