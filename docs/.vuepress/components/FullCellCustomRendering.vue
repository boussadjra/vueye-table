<template>
  <div id="app">
    <VueyeTable :data="todos" :columns="columns" title="Todos">
      <template v-slot:cell.completed="{item}">
        <td :style="{'background':colors[item.userId-1],'color':'white'}" data-label="Completed">{{item.userId}}</td>
      </template>
      <template v-slot:completed="{item}">{{item.completed?'Yes':'No'}}</template>
    </VueyeTable>
  </div>
</template>

<script>
import todos from "../assets/todos.json";

export default {
  name: "FullCellCustomRendering",
  data: () => ({
    todos,
    columns: [
      {
        key: "id",
        label: "ID",
        sortable: true,
        display: true
      },
      {
        key: "userId",
        label: "User ID",
        sortable: true,
        display: true
      },
      {
        key: "title",
        label: "Title",
        display: true
      },
      {
        key: "completed",
        label: "Completed",
        display: true
      }
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
    ]
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
