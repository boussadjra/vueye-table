<template>
  <div class="ve-table-wrapper" :class="classes">
    <ve-header
      v-if="headerDisplay"
      :title="title"
      :columns="columns"
      @select-columns="onSelectColumns"
      @select-filter-by="selectFilterBy"
      v-model="state.searchValue"
      :config="config"
    />
    <ve-grid
      :columns="state.selectedColumns"
      :key-transition="keyTransition"
      :sort-by="sortBy"
      :search-value="state.searchValue"
      :filter-by="state.selectedFilterBy"
      :selectRows="selectRows"
      :expand="expand"
    >
      <template v-for="slot in Object.keys($scopedSlots)" v-slot:[slot]="scope">
        <slot :name="slot" v-bind="scope"/>
      </template>
      <template v-for="slot in $slots">
        <slot :name="slot"></slot>
      </template>
    </ve-grid>

    <ve-footer>
      <ve-pagination
        @update-page="updatePage"
        :per-page-values="perPageOptions"
        :per-page="server?server.perPage:perPage"
        :config="config"
        :server="server"
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
import { reactive, onMounted, watch, computed } from "@vue/composition-api";
import { getDeepNestedFieldValue } from "./helpers";
import { store, mutations } from "./store";
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
    value: Array,
    server: {
      type: Object,
      default: null
    },
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
      default: () => [5, 10, 25, 50, 100]
    },
    perPage: {
      type: Number,
      default: 10
    },
    selectRows: {
      type: Boolean,
      default: false
    },
    dense: {
      type: Boolean,
      default: false
    },
    striped: {
      type: Boolean,
      default: false
    },
    bordered: {
      type: Boolean,
      default: false
    },
    headerDisplay: {
      type: Boolean,
      default: true
    },
    config: {
      type: Object,
      default: () => ({
        filterBy: "Filter by",
        search: "Search",
        nbRowsPerPage: "Number of rows per page",
        of: "of"
      })
    }
  },
  setup(props, context) {
    const {
      dense,
      headerDisplay,
      striped,
      bordered,
      perPage,
      perPageValues,
      server
    } = props;
    const state = reactive({
      displayedData: [...props.data],
      allData: [...props.data],
      selectedColumns: [],
      searchValue: "",
      selectedFilterBy: props.filterBy
    });

    function updatePage(items, currentPage,nbRowPerPage) {
      state.displayedData = items.value;
    
      if (server && currentPage) {
      
        context.emit("update-request", currentPage.value,nbRowPerPage.value);
      }
    }

    function onSelectColumns(selectedColumns) {
      state.selectedColumns = selectedColumns;
    }

    function selectFilterBy(selectedFilterBy) {
      state.selectedFilterBy = selectedFilterBy.key;
    }
    onMounted(() => {
      state.selectedColumns = props.columns.filter(col => col);
    });

    watch(
      () => props.data,
      (newVal, oldVal) => {
        mutations.setAllData(newVal);
      }
    );

    watch(
      () => store.selectedRows,
      newV => {
        context.emit("input", newV);
      }
    );

    const expand = computed(() => {
      return context.slots.expand !== undefined;
    });
    const perPageOptions = computed(() => {
      if (server && !perPageValues.includes(server.perPage)) {
        let _perPageValues = [...perPageValues];
        _perPageValues.push(server.perPage);
        return _perPageValues.sort((a, b) => (a > b ? 1 : -1));
      }

      return perPageValues;
    });
    const classes = computed(() => {
      return {
        "ve-table-wrapper-dense": dense,
        "ve-table-wrapper-no-header": !headerDisplay,
        "ve-table-wrapper-striped": striped,
        "ve-table-wrapper-bordered": bordered
      };
    });
    return {
      state,
      updatePage,
      onSelectColumns,
      selectFilterBy,
      expand,
      classes,
      perPageOptions
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
