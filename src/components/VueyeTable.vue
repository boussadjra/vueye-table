<template>
  <div class="ve-table-wrapper">
    <ve-header
      :title="title"
      :columns="columns"
      @select-columns="onSelectColumns"
      @select-filter-by="selectFilterBy"
      v-model="state.searchValue"
    />
    <ve-grid
      :columns="state.selectedColumns"
      
     
      :key-transition="keyTransition"
      :sort-by="sortBy"
      :search-value="state.searchValue"
      :filter-by="state.selectedFilterBy"
    >
      <!--  <template v-for="(_, slot) of $scopedSlots" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope"/>
      </template>-->

      <template v-for="slot in Object.keys($scopedSlots)" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope"/>
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
import { reactive, onMounted, watch } from "@vue/composition-api";
import { getDeepNestedFieldValue } from "./helpers";
import {mutations} from './store'
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
    filterBy: {
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
    },
    customFilter: {
      type: Function,
      default: (items, search, filter, columns) => {
        search = search.toString().toLowerCase();
        if (search.trim() === "") return items;

        const props = columns.map(h => h.key);

        return items.filter(item =>
          props.some(prop =>
            filter(getDeepNestedFieldValue(prop, item), search)
          )
        );
      }
    }
  },
  setup(props, context) {
    const state = reactive({
      displayedData: [...props.data],
      allData:[...props.data],
      selectedColumns: [],
      searchValue: "",
      selectedFilterBy: props.filterBy
    });

    function updatePage(items) {
      state.displayedData = items.value;
    }

    function onSelectColumns(selectedColumns) {
      state.selectedColumns = selectedColumns;
    }

    function selectFilterBy(selectedFilterBy) {
      state.selectedFilterBy = selectedFilterBy.key;
    }
    onMounted(() => {
      state.selectedColumns = props.columns.filter(col => col.display);
      mutations.setAllData(props.data)
    });
    return {
      state,
      updatePage,
      onSelectColumns,
      selectFilterBy
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
