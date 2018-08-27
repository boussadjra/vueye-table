# Vueye Table
![Vueye](https://github.com/boussadjra/vueye-table/blob/master/src/assets/vueye.png 300x250)

Vueye table is a data table component based on [Vue.js 2](http://vuejs.org),
this component allows you to sort, search, print, export checked rows and export to excel 
your data and also to change theme.

### Installation
```
npm install vueye-table
```
### Use

```js
<template>
...
<vueye-table title="Users" show-theme :rows_data="user_data" v-on:row-clikc="onrowclick" v-on:checked-rows="getChecked"></vueye-table>
...
</template>

<script>
import VueyeTable from "vueye-table";

export default {
  name: "app",
  data() {
    return {
      user_attr: ["id", "name", "phone"],
      user_data: []
    };
  },
  components: {
    VueyeTable
  },
  methods: {
   
    getChecked(rows){
      //
    },
    onrowclick(row){
        //
    }
  }
 
};
</script>


```
