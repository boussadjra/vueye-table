# Guide

## Getting Started

### Introduction

It's a data table created using Vue.js, which has some features like :

-   Show data per page
-   Sort columns
-   Cells Custom rendering
-   CRUD Actions
-   Customize the columns display
-   Filter data by fields

### Installation

    npm install vueye-table --save

### Requirements

To make this component work with Vue 2, you should use the Vue composition-api plugin by importing it and using it in `main.js` as follows :

```js{3,5}
import Vue from 'vue';
import App from './App.vue';
import VueComp from '@vue/composition-api';

Vue.use(VueComp);

new Vue({
	render: h => h(App),
}).$mount('#app');
```

## Columns configuration

The `columns` prop value could have the following structure :

```js
 columns: [
      {
        key: "id",
        label: "ID",
        sortable: true,
        type: "number",
        display: true
      },
      ...
 ]
```

| key      | description                                                                     |
| -------- | ------------------------------------------------------------------------------- |
| key      | the corresponding field in the data array, it could be a path to a nested field |
| label    | the text to show in the table head                                              |
| sortable | Allow or not the column sorting                                                 |
| type     | the field type                                                                  |
| display  | show the column                                                                 |

## Examples

### Basic Example

::: details Input
<<< @/docs/.vuepress/components/BasicExample.vue

:::

::: details Output

 <BasicExample />

:::

### Display table header

---

The table header contains the title, search input and the export and print buttons

::: details Input
<<< @/docs/.vuepress/components/WithHeader.vue
:::

::: details Output
<WithHeader />
:::

### Table body custom rendering

::: details Input
<<< @/docs/.vuepress/components/CustomRendering.vue
:::

<CustomRendering />

### Table body cells custom rendering
If you want to take the control over the whole cell you can prefix
the `column` key with `cell.` keyword and here you're able to style and render the `td` element as you want 
::: details Input
<<< @/docs/.vuepress/components/FullCellCustomRendering.vue
:::

<FullCellCustomRendering />


### Table head custom rendering

You could also customize the `column` label in the table head. 
::: details Input
<<< @/docs/.vuepress/components/HeadCustomRendering.vue
:::
::: details Output
<HeadCustomRendering />
:::

### Table head full cell custom rendering

 You could be able to customize the full head cell of given column (not just the label), to make this you have access to a property called `columnDef` which contains `column` and the `sorter` that has the following fields:

   1 - `handler` this function is used to sort the given column which should be passed as parameter
   2 - `column.direction` the sort direction, by default its value is `none` if you click in the sort icon this passes to `asc`, then to `desc`, if you click again it comes back to `none` and so on.


::: details Input
<<< @/docs/.vuepress/components/HeadCellCustomRendering.vue
:::
::: details Output
<HeadCellCustomRendering />
:::

### Select rows

::: details Input
<<< @/docs/.vuepress/components/SelectRows.vue
:::

::: details Output
<SelectRows />
:::

### Expand rows

If there's more details and you don't want to overload your table, so you could put that details inside an expanded row with your custom style 

::: details Input
<<< @/docs/.vuepress/components/ExpandRows.vue
:::

::: details Output
<ExpandRows />
:::

### Config default labels
 
 I don't like to use `i18n` configuration in order to make the component internationalized, but i prefered to give the developer the freedom to make its own config. 

::: details Input
<<< @/docs/.vuepress/components/ConfigDefaultLabels.vue
:::

::: details Output
<ConfigDefaultLabels />
:::
## Props

| Name            | Description                                  |
| --------------- | -------------------------------------------- |
| title           | the data table title                         |
| columns         | the attributes or columns                    |
| data            | JS array of object or json content           |
| filter-by       | specify the default column for filter        |
| per-page-values | the array of per pages values                |
| per-page        | the default per page                         |
| select-rows     | add checkbox columns in order to select rows |
| v-model         | returns the selected rows                    |
| dense           | Show table rows in small size                |
| headerDisplay   | show/hide the table header                   |
| config   | change the default labels                   |




<style>
  table{
    border-left: thin solid rgba(0,0,0,0.12);
    border-right: thin solid rgba(0,0,0,0.12);
    border-radius:6px;
  }
 tr:nth-child(2n){
   background-color:inherit;
 }
tbody tr {
        height: 48px;
        text-align: start;

}


th,
td {
  border:none;
    border-bottom: thin solid rgba(0,0,0,0.12);
    text-align:left;
}
.custom-block.details{
  background-color:white;
  background-color: white;
    border: thin solid #70f;
    border-radius: 46px;
}
.custom-block.details summary{
color: #70f;

}
.custom-block.details[open] summary{
   margin-bottom:20px;

}
::-webkit-scrollbar {
    width: 10px;
    border-radius: 5px
}

::-webkit-scrollbar-track {
    background: inherit;
    border-radius: 5px;
}

::-webkit-scrollbar-thumb {
    background: #7700ff;
    border-radius: 5px;
}
</style>
