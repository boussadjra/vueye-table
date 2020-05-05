import { ref } from "@vue/composition-api";

import {getDeepNestedFieldValue} from '../helpers'
const useMapper = (data, cols) => {
    const rows = ref([]);
    const notMappedData = ref([]);
    const columns = ref([]);

    function map() {
      if(columns.value.length>0){
        rows.value = notMappedData.value.map(item => {
          let row = {};
      
          columns.value.forEach(column => {
          
            row[column.key] =getDeepNestedFieldValue(column.key,item);
          });
      
          return row;
        });
      }else{
        rows.value=[]
     
      }
     
  
    }

    function setColumns(_columns) {
      columns.value=_columns;
    }
    function setNotMappedData(_rows) {
      notMappedData.value=_rows
      map()
    }
    return {rows,handler:map,setColumns,setNotMappedData};
  };

  export default useMapper;