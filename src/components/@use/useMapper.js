import { ref } from "@vue/composition-api";

import {getDeepNestedFieldValue} from '../helpers'
const useMapper = (data, columns) => {
    const rows = ref([]);
    rows.value = data.map(item => {
      let row = {};
      columns.forEach(column => {
        row[column.key] =getDeepNestedFieldValue(column.key,item);
      });
  
      return row;
    });
  
    return rows;
  };

  export default useMapper;