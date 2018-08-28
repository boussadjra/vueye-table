# Vueye DataTable
![Vueye](https://raw.githubusercontent.com/boussadjra/vueye-table/master/src/assets/vueye.png )

Vueye data table is a responsive data table component based on [Vue.js 2](http://vuejs.org), it organizes 
your data per pages in order to navigate easily.

This component allows you to :

* Sort columns
* Search data
* Print your data into a spreadsheet
* Emit checked rows and the clicked row to the parent component 
* Export to excel 
* Change theme (colors)
* Many languages: English(en), Arabic(ar), French(fr), Spanish(es), German(ger) and Chinese(ch) 

## Demo
 [Vueye data table demo](https://boussadjra.github.io/vueye-table/)
## Requirement
 * Vue.js 2
 * It doesn't require any css framework
## Installation
```
npm install vueye-datatable --save-dev
```
## Use

```js
<template>
...
<vueye-table title="Users" show-theme :rows_data="user_data" v-on:row-clikc="onrowclick" 
   v-on:checked-rows="getChecked"></vueye-table>
...
</template>
<script>
import VueyeTable from "vueye-datatable";
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
### Props 

```
 title            : the data table title
 cols             : the attributes or columns, by default it takes the json object keys
 rows_data        : JS array of object or json content
 per-pages-values : An array containing the possible number of rows per page 
 theme-name       : specify a theme name, available ones are light, dark-1 and dark-2 
 table-style      : the type of table bordered or striped
 show-theme       : if this prop is not mentionned the theme bar will be hidden
 checkable        : show/hide the checkboxes column and the export checked rows button
 vLang            : specify the data table language
```

### Screenshots

![Screenshot 1](https://raw.githubusercontent.com/boussadjra/vueye-table/blob/master/src/assets/scrshot1.png )
![Screenshot 2](https://raw.githubusercontent.com/boussadjra/vueye-table/blob/master/src/assets/scrshot2.png )
![Screenshot 3](https://raw.githubusercontent.com/boussadjra/vueye-table/blob/master/src/assets/scrshot3.png )