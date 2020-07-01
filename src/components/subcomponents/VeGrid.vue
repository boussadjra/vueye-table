<template>
  <table class="ve-table">
    <thead>
      <tr>
        <th v-if="selectRows">
          <label class="ve-checkbox">
            <input type="checkbox" v-model="allSelected">
            <span class="ve-checkmark" :class="{'ve-checkmark-minus':someSelected}"></span>
          </label>
        </th>
        <template v-for="(column, index) in columns">
          <template v-if="$scopedSlots['header.cell.'+column.key]">
            <slot :name="'header.cell.'+column.key" :columnDef="{column,sorter}" ></slot>
          </template>
          <th v-else-if="$scopedSlots['header.'+column.key]">
            <div>
              <slot :name="'header.'+column.key" :column="column"></slot>
              <icon v-if="sorter.arrowSortShown(column)" name="arrow-up"/>
            </div>
          </th>
          <th v-else>
            <div
              class="ve-table-head-cell"
              :class="sorter.labelClass(column)"
              @click="column.sortable?sorter.handler(column):{}"
            >
              <span>{{column.label}}</span>
              <icon v-if="sorter.arrowSortShown(column)" name="arrow-up"/>
            </div>
          </th>
        </template>
        <th v-if="expand"></th>
      </tr>
    </thead>
    <tbody name="flip-list" is="transition-group">
      <template v-for="(item, i) in items">
        <tr :key="item[keyTransition]?item[keyTransition]:i" class="ve-table-row-item">
          <td v-if="selectRows">
            <label class="ve-checkbox">
              <input type="checkbox" :value="item" v-model="selectedRows" @change="checkRows">
              <span class="ve-checkmark"></span>
            </label>
          </td>
          <template v-for="(column, key) in columns">
            <template v-if="$scopedSlots['cell.'+column.key]" :data-label="column.label">
              <slot :name="'cell.'+column.key" :item="item"></slot>
            </template>
            <td v-else-if="$scopedSlots[column.key]" :data-label="column.label">
              <slot :name="column.key" :item="item"></slot>
            </td>
            <td v-else :data-label="column.label">{{item[column.key]}}</td>
          </template>
          <td>
            <icon
              v-if="expand"
              name="chevron-right"
              fill="#888"
              height="14px"
              width="14px"
              class="ve-table-row-expand-icon"
              :class="{'ve-table-row-expand-icon-open':expandRow===i}"
              @click.native="expandRow===i?expandRow=-1:expandRow=i"
            />
          </td>
        </tr>
        <tr :key="'ex'+i" class="ve-table-row-item ve-table-row-expand" v-if="expandRow===i">
          <td :colspan="Object.keys(item).length+1">
            <slot name="expand" :item="item"></slot>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<script>
import Icon from "../icons";
import {
  ref,
  computed,
  onMounted,
  watch,
  reactive
} from "@vue/composition-api";
import useMapper from "../@use/useMapper.js";
import useSorter from "../@use/useSorter.js";
import useFilter from "../@use/useFilter.js";
import { store, mutations } from "../store";

export default {
  name: "ve-grid",
  props: {
    columns: {
      type: Array,
      default: () => []
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
    searchValue: {
      type: String,
      default: ""
    },
    selectRows: {
      type: Boolean,
      default: false
    },
    expand: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const { columns, sortBy, searchValue, filterBy, selectRows } = props;

    const mapper = useMapper([], columns);

    const sorter = useSorter([], sortBy);
    const filter = useFilter([], searchValue, null);

    const selectedRows = ref([]);
    const allSelected = ref(false);
    const someSelected = ref(false);
    const expandRow = ref(-1);
    const items = computed(() => {
      return store.currentPageItems;
    });

    watch(
      () => store.allData,
      (newV, oldV) => {
        sorter.resetSortedBy();
        mapper.setNotMappedData(newV);
        filter.setItems(mapper.rows.value);

        sorter.setSortedData(mapper.rows.value);
      }
    );
    watch(
      () => store.selectedRows,
      (newV, oldV) => {
        someSelected.value =
          items.value.length !== newV.length && newV.length > 0;
        selectedRows.value = newV;
      }
    );
    watch(allSelected, newVal => {
      newVal
        ? mutations.setSelectedRows(items.value)
        : mutations.setSelectedRows([]);
    });
    watch("columns", (newV, oldV) => {
      mapper.setColumns(newV);

      mapper.handler();

      sorter.setSortedData(mapper.rows.value);
      filter.setItems(mapper.rows.value);
    });

    watch("searchValue", (newV, oldV) => {
      filter.setSearchValue(newV);

      filter.handler();
      sorter.setSortedData(filter.filteredItems.value);
      mutations.setHandledData(filter.filteredItems.value);
    });

    watch("filterBy", (newV, oldV) => {
      filter.setKey(newV);

      filter.handler();
      sorter.setSortedData(filter.filteredItems.value);
      mutations.setHandledData(filter.filteredItems.value);
    });
    watch(sorter.data, newVal => {
      mutations.setHandledData(newVal);
    });

    function checkRows() {
      mutations.setSelectedRows(selectedRows.value);
    }

    return {
      mapper,
      sorter,
      items,
      checkRows,
      selectedRows,
      allSelected,
      someSelected,
      expandRow
    };
  },

  components: {
    Icon
  }
};
</script>

<style>
</style>
