<template>
  <div class="ve-table-wrapper">
    <ve-header :title="title" :columns="columns" @select-columns="onSelectColumns"/>
    <ve-grid
      :columns="state.selectedColumns"
      :data="state.displayedData"
      :key-transition="keyTransition"
      :sort-by="sortBy"
    >
    <!--  <template v-for="(_, slot) of $scopedSlots" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope"/>
      </template>-->

        <template v-for="slot in Object.keys($scopedSlots)"  v-slot:[slot]="scope">
          <slot :name="slot" v-bind="scope" />
        </template>
    </ve-grid>
  </div>
</template>
    </ve-grid>
    <ve-footer>
      <ve-pagination
        @update-page="updatePage"
        :per-page-values="perPageValues"
        :data="data"
        :per-page="perPage"
      />
    </ve-footer>
  </div>
</template>

<script>
import "./style.scss";
import VeHeader from "./subcomponents/VeHeader";
import VeGrid from "./subcomponents/VeGrid";
import VeFooter from "./subcomponents/VeFooter";
import VePagination from "./subcomponents/VePagination";
import { reactive, onMounted } from "@vue/composition-api";

/*
 *
 ****
 *
 */
export default {
  props: {
    data: Array,
    columns: Array,
    title: String,
    keyTransition: {
      type: String,
      default: "id"
    },
    sortBy: {
      type: String,
      default: null
    },
    perPageValues: {
      type: Array,
      default: () => [5, 10, 25, 50, 100, 500]
    },
    perPage: {
      type: Number,
      default: 10
    }
  },
  setup(props, context) {
    const state = reactive({
      displayedData: [...props.data],
      selectedColumns: []
    });

    function updatePage(items) {
      state.displayedData = items.value;
    }

    function onSelectColumns(selectedColumns) {
      state.selectedColumns = selectedColumns;
    }
    onMounted(() => {
      state.selectedColumns = props.columns.filter(col => col.display);
    
    });
    return {
      state,
      updatePage,
      onSelectColumns
    };
  },
  components: {
    VeHeader,
    VeGrid,
    VeFooter,
    VePagination
  }
};
</script>

<style>
.flip-list-move {
  transition: all 1s;
}
</style>
