<template>
  <div class="ve-table-wrapper">
    <ve-header :title="title"/>
    <table class="ve-table">
      <thead>
        <tr>
          <th v-for="(column, index) in columns" :key="index">
            <div
              class="ve-table-head-cell"
              :class="sorter.labelClass(column)"
              @click="column.sortable?sorter.handler(column):{}"
            >
              <span
                
              >{{column.label}}</span>
              <icon v-if="sorter.arrowSortShown(column)" name="arrow-up"/>
            </div>
          </th>
        </tr>
      </thead>
      <tbody name="flip-list" is="transition-group">
        <tr v-for="(row, i) in items" :key="row[keyTransition]" class="ve-table-row-item">
          <td v-for="(item, j) in row" :key="j">{{item}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { ref, onMounted, computed } from "@vue/composition-api";
import useMapper from "./@use/useMapper.js";
import useSorter from "./@use/useSorter.js";
import "./style.scss";
import VeHeader from "./subcomponents/VeHeader";
import Icon from "./icons";
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
    keyTransition:{
      type:String,
      default:'id'
    },
    sortBy:{
      type:String, 
      default:null
    },
     perPageValues: {
            type: Array,
            default: () => [5, 10, 25, 50, 100, 500]
        },
        perPage:{
          type:Number,
          default: 10
        }
  },
  setup(props) {
    const { data, columns,sortBy } = props;

    const rows = useMapper(data, columns);
    const sorter = useSorter(data,sortBy);

    let items = computed(() => {
      if (sorter.column.direction !== "none" || sortBy!==null) {
       
        const sortedMappedRows = useMapper(sorter.data.value, columns);
 console.log('--------------------')
        console.log(sortedMappedRows)
        console.log('--------------------')
        return sortedMappedRows.value;
      } else {
        return rows.value;
      }
    });

    onMounted(() => {});
    return {
      rows,
      sorter,

      items
    };
  },

  components: {
    VeHeader,
    Icon
  }
};
</script>

<style>
.flip-list-move {
  transition: all 1s;
}
</style>
