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
import { maroon } from "color-name";
export default {
  name: "ve-grid",
  props: {
    columns: {
      type: Array,
      default: () => []
    },
    data: {
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
    }
  },
  setup(props) {
    const { data, columns, sortBy } = props;

    const mapper = useMapper(data, columns);

    const sorter = useSorter(data, sortBy);

    const items = computed(() => {
      if (sorter.column.direction !== "none" || sortBy !== null) {
        return sorter.data.value;
      } else {
        return mapper.rows.value;
      }
    });

    watch("data", (newV, oldV) => {
      sorter.resetSortedBy();
      mapper.setNotMappedData(newV);
    });

    watch("columns", (newV, oldV) => {
      mapper.setColumns(newV);

      mapper.handler();
      sorter.setSortedData(mapper.rows.value);
    });

    return {
      mapper,
      sorter,
      items
    };
  },
  errorCaptured(err, vm, info) {
    console.log("--------error hook----------");
    console.log(err, vm, info);
    console.log("--------------------");
  },
  components: {
    Icon
  }
};
</script>

<style>
</style>
