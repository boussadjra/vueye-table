<template>
  <table class="ve-table">
    <thead>
      <tr>
        <th v-for="(column, index) in columns" :key="index">
          <div
            class="ve-table-head-cell"
            :class="sorter.labelClass(column)"
            @click="column.sortable?sorter.handler(column):{}"
          >
            <span>{{column.label}}</span>
            <icon v-if="sorter.arrowSortShown(column)" name="arrow-up"/>
          </div>
        </th>
      </tr>
    </thead>
    <tbody name="flip-list" is="transition-group">
      <tr
        v-for="(item, i) in items"
        :key="item[keyTransition]?item[keyTransition]:i"
        class="ve-table-row-item"
      >
        <template v-for="(column, key) in columns">
          <td v-if="$scopedSlots[column.key]" :data-label="column.label">
            <slot :name="column.key" :item="item"></slot>
          </td>
          <td v-else :data-label="column.label">{{item[column.key]}}</td>
        </template>
      </tr>
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
    }
  },
  setup(props) {
    const { columns, sortBy, searchValue, filterBy } = props;

    const mapper = useMapper([], columns);

    const sorter = useSorter([], sortBy);
    const filter = useFilter([], searchValue, null);

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

    return {
      mapper,
      sorter,
      items
    };
  },

  components: {
    Icon
  }
};
</script>

<style>
</style>
