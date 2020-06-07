<template>
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
import users from "../assets/github_users.json";
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
