# Vueye DataTable

Vueye data table is a responsive data table component based on [Vue.js 2](http://vuejs.org), it organizes 
your data per pages in order to navigate easily.

![Vueye](https://raw.githubusercontent.com/boussadjra/vueye-table/master/src/assets/vueye.png )

This component allows you to :

* Sort columns
* Search data
* Print your data into a spreadsheet
* Emit checked rows and the clicked row to the parent component 
* Export to excel 
* Create your own theme (colors)
* Many languages: English(en), Arabic(ar), French(fr), Spanish(es), German(ger) and Chinese(ch) 

## Demo
 [Vueye data table demo](https://boussadjra.github.io/vueye-table/)
 or the [video](https://www.youtube.com/watch?v=3isA2Sl7MyQ)
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
<vueye-table 
     checkable 
     tableStyle="bordered" 
     :theme="theme3" 
     :per-page-values="[5,10,25,50]"
     title="TODOS"  
    :rows_data="todos" 
    v-on:checked-rows="getChecked"
    v-on:row-click="onrowclick"
    ></vueye-table>

...
</template>
<script>
import VueyeTable from "vueye-datatable";
export default {
  name: "app",
  data() {
    return {
     
      todos: [],
       theme3: {
				backgroundColor: "#141443",
				color: "#eee",
				rows:{
					borderBottom: "1px solid #eee"
				},
				rowClick: {
					backgroundColor: "#0D0B2F"
				}
			}
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
  },
  mounted() {
  this.axios.get("https://jsonplaceholder.typicode.com/todos").then(res=>{
      this.todos=res.data;
  })
}
};
</script>

```
### Props 


|Name | Description |
|--------------------|------------------------|
| title | the data table title|
| cols | the attributes or columns, by default it takes the json object keys|
| rows_data | JS array of object or json content|
| per-pages-values | An array containing the possible number of rows per page |
| table-style | the type of table **bordered** or **striped** |
| checkable | show/hide the checkboxes column and the export checked rows button |
| v-lang| specify the data table language |
| header-shown | show/hide the data table header|
| theme | define your own theme by specifying the background color, the text and the border bottom color |
