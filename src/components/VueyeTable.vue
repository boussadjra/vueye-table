<template>
	<div class="vet-container" :style="theme" :id="componentId" :dir="locale.dir">
   
		<div class="vet-header" v-if="headerShown">
			<div class="vet-header-title">
				<h4> {{title}}</h4>
			</div>
			<div class="vet-header-search-container">
				<input type="text" name="search" :placeholder="locale.search_data" class="vet-header-search"
				v-model="searchValue" :style="theme.rows.borderBottom">
				
        <v-icon    name="search"    style="margin-left:-24px"/>
      </div>
      <div class="vet-header-btns">
        <v-icon  class="v-icon"  name="check-square"  @click.native="exportCheckedRows" v-if="checkable"  />
        <v-icon   class="v-icon"  name="file-excel"  @click.native="exportTableToExcel" />
        <v-icon   class="v-icon"  name="print"  @click.native="printTable" />

      </div>

    </div>
    <table :id="title|lowercase" >
     <thead :style="{borderBottom:theme.rows.borderBottom}" >
      <th  :style="getTableStyle" v-if="checkable"></th>
      <th  :style="getTableStyle" v-for="(col,index) in columns" :key="col">
       <div class="tab-head-cell">
        <span>{{col}}</span>
        <span class="tab-head-cell-icons">
          <v-icon   class="v-icon"  name="arrow-up"  scale="0.5" @click.native="sort('asc',index)"/>
          <v-icon   class="v-icon"  name="arrow-down"  scale="0.5" @click.native="sort('desc',index)"/>

        </span>
      </div>
    </th>
  </thead>
  <tbody>
    <tr class="data-row" :style="theme" v-for="(row,indx) in currentPageData" :id="componentId+indx"  @click="clickOnRow(row,String(componentId+indx))">
     <td  :style="getTableStyle" v-if="checkable">       
      <label class="container">
       <input type="checkbox" :id="'cb'+indx" :value="row" v-model="checkedRows">
       <span class="checkmark" :id="'ck'+indx" ></span>
     </label></td>
     <td :data-label="key" :style="getTableStyle" class="tab-rows_data-cell" v-for="(cell,key,index)  in row" :key="key+index"> {{cell}}</td>
   </tr>
 </tbody>
</table>

<div class="vet-footer">
  <div class="vet-footer-perpage">
   <span>{{locale.nb_rows_ppage}} </span>
   <select v-model="nbRowPerPage" @change="recreatePages">
    <option v-for="ppval in perPageValues " :value="ppval" :key="ppval">{{ppval}}</option>
    
  </select>
</div>
<div class="vet-footer-page-desc">
 <span> {{lowerBound}} <strong>-</strong> {{upperBound}} {{locale.of}} {{rows_data.length}} </span>
</div>
<div class="vet-footer-pagination" >
  <v-icon  :class="rotated" class="v-icon"  name="step-backward"  @click.native="gotoFirstPage" />
  <v-icon  :class="rotated" class="v-icon"  name="chevron-left"  @click.native="gotoPrevPage" />
  <v-icon :class="rotated"  class="v-icon"  name="chevron-right"  @click.native="gotoNextPage" />
  <v-icon :class="rotated"  class="v-icon"  name="step-forward"  @click.native="gotoLastPage" />

  
</div>

</div>

</div>
</template>

<script>
import Vue from "vue";
import "vue-awesome/icons";

import Icon from "vue-awesome/components/Icon";

Vue.component("v-icon", Icon);
import locales from "./locales";

export default {
  name: "vueye-table",
  /**************************************** */
  /**************************************** */
  /**************************************** */
  /****************@prop ****************** */
  /**************************************** */
  /**************************************** */
  props: {
    headerShown: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: "My table"
    },
    vLang: {
      type: String,
      default: "en"
    },
    cols: {
      type: Array,
      default: () => []
    },
    rows_data: {
      type: Array,
      default: () => []
    },
    perPageValues: {
      type: Array,
      default: () => [5, 10, 25, 50, 100, 500]
    },
    
    theme: {
      type: Object,
      default: () => ({
        backgroundColor: "#f7faf7",
        color: "#6a6a6a",
        borderBottom: "1px solid #d2c7c7",
        rowClick: {
          backgroundColor: "#ddd"
        }
      })
    },
    tableStyle: {
      type: String,
      default: "bordered"
    },
   
    checkable: {
      type: Boolean,
      default: false
    }
  },
  /**************************************** */
  /**************************************** */
  /**************************************** */
  /****************@data *************** */
  /**************************************** */
  /**************************************** */
  data() {
    return {
      componentId: "",
      searchValue: "",
      currentPageIndex: 0,
      nbRowPerPage: 10,
      nbPages: 0,
      paginated_data: {},
      checkedRows: [],
      currentTheme: {
        main: {},
        borderBottom: {},
        rowClick: {}
      },
      customIcon: "gray-icon",
      rotated: ""
    };
  },
  filters: {
    lowercase(val) {
      return val
      .toString()
      .toLowerCase()
      .replace(/ /g, "-");
    }
  },
  /**************************************** */
  /**************************************** */
  /**************************************** */
  /****************@computed ************** */
  /**************************************** */
  /**************************************** */
  computed: {
    columns() {
      if (this.cols.length == 0) {
        if (typeof this.rows_data[0] == "object") {
          return Object.keys(this.rows_data[0]);
        }
      } else {
        return this.cols;
      }
    },
    locale() {
      locales[this.vLang].dir == "rtl"
      ? (this.rotated = "rotated-icon")
      : (this.rotated = "");
      return locales[this.vLang];
    },
    /**@function currentPageData locates to the first page by default
     * or to the page we are going to by paginating
     */
     currentPageData() {
      if (this.searchValue == "") {
        this.createPages();
        return this.paginated_data[this.currentPageIndex];
      } else {
        this.createPagesAfterSearch();
        return this.paginated_data[this.currentPageIndex];
      }
    },
    /**@function lowerBound in the current page show lower bound of showed data compared to the origin data */
    lowerBound() {
      return this.currentPageIndex * this.nbRowPerPage + 1;
    },
    /**@function upperBound in the current page show upper bound of showed data compared to the origin data */
    upperBound() {
      return (this.currentPageIndex + 1) * this.nbRowPerPage >
      this.rows_data.length
      ? this.rows_data.length
      : (this.currentPageIndex + 1) * this.nbRowPerPage;
    },
    
    getTableStyle() {
      if (this.tableStyle === "striped") {
        return {
          borderBottom: this.theme.rows.borderBottom
        };
      } else {
        return { border: this.theme.rows.borderBottom };
      }
    }
  },
  /**************************************** */
  /**************************************** */
  /**************************************** */
  /****************@methods *************** */
  /**************************************** */
  /**************************************** */

  methods: {
    generateComponentId() {
      let text = "";
      let possible = "abcdefghijklmnopqrstuvwxyz";

      for (let i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    },
    /*** @method createPages  creates pages with default per page value */
    createPages() {
      /** @description lengthAll for getting the length of the array containing all data */
      let lengthAll = Object.keys(this.rows_data).length;
      this.nbPages = 0;
      /** @description We slice our initial data according to the @nbRowPerPage */
      for (let i = 0; i < lengthAll; i = i + this.nbRowPerPage) {
        this.paginated_data[this.nbPages] = this.rows_data.slice(
          i,
          i + this.nbRowPerPage
          );
        this.nbPages++;
      }
    },
    createPagesAfterSearch() {
      this.currentPageIndex = 0;
      /** @description lengthSearch for getting the length of the array containing searched data */
      let lengthSearch = Object.keys(this.search()).length;

      if (lengthSearch !== 0) {
        this.nbPages = 0;
        /** @description We slice our searched data according to the @nbRowPerPage */
        for (let i = 0; i < lengthSearch; i = i + this.nbRowPerPage) {
          this.paginated_data[this.nbPages] = this.search().slice(
            i,
            i + this.nbRowPerPage
            );
          this.nbPages++;
        }
      } else {
        this.paginated_data = [];
      }
    },

    /** @method recreatePages  creates pages when we select a new per page value
     *  and set the index to the first page
     */
     recreatePages() {
      this.currentPageIndex = 0;
      this.createPages();
    },
    gotoFirstPage() {
      this.currentPageIndex = 0;
    },
    gotoPrevPage() {
      this.currentPageIndex > 0
      ? this.currentPageIndex--
      : (this.currentPageIndex = 0);
    },
    gotoNextPage() {
      this.currentPageIndex < this.nbPages - 1
      ? this.currentPageIndex++
      : (this.currentPageIndex = this.nbPages - 1);
    },
    gotoLastPage() {
      this.currentPageIndex = this.nbPages - 1;
    },
    compareValues(key, order) {
      return function(a, b) {
        if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
          // property doesn't exist on either object
          return 0;
        }

        let varA = typeof a[key] === "string" ? a[key].toUpperCase() : a[key];
        let varB = typeof b[key] === "string" ? b[key].toUpperCase() : b[key];

        let comparison = 0;
        if (varA > varB) {
          comparison = 1;
        } else if (varA < varB) {
          comparison = -1;
        }
        return order === "desc" ? comparison * -1 : comparison;
      };
    },
    /**@method sort this method sort our data by specifiying the sort type and the column to be sorted */
    sort(sortDirection, index) {
      let tmp_data = this.rows_data.sort(
        this.compareValues(Object.keys(this.rows_data[1])[index], sortDirection)
        );
    },
    /**@method search return the items which values start with searched value
     * you could specify another criteria to search by modifying this method
     */
     search() {
      if (this.searchValue != "") {
        let searchedData = [];
        searchedData = this.rows_data.filter(item => {
          let values = Object.values(item).filter(val => {
            return val
            .toString()
            .toUpperCase()
            .startsWith(this.searchValue.toUpperCase());
          });
          if (values.length != 0) {
            return item;
          }
        });
        return searchedData;
      }
    },
    clickOnRow(row, index) {
      let els = document.getElementsByClassName("data-row");
      for (let i = 0; i < els.length; i++) {
        els[i].style.backgroundColor = "inherit";
      }
      let e = document.getElementById("" + index);
      this.theme.rowClick != undefined
      ? (e.style.backgroundColor = this.theme.rowClick.backgroundColor)
      : (e.style.backgroundColor = "#ddd");
      this.$emit("row-click", row);
    },
    exportCheckedRows() {
      this.$emit("checked-rows", this.checkedRows);
      this.checkedRows = [];
    },
    exportTableToExcel() {
      let downloadLink;
      let dataType = "application/vnd.ms-excel";
      let tableSelect = this.createTable();
      let tableHTML = tableSelect.replace(/ /g, "%20");

      // Specify file name
      let filename = this.title + ".xls";

      // Create download link element
      downloadLink = document.createElement("a");

      document.body.appendChild(downloadLink);

      if (navigator.msSaveOrOpenBlob) {
        let blob = new Blob(["\ufeff", tableHTML], {
          type: dataType
        });
        navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        // Create a link to the file
        downloadLink.href = "data:" + dataType + ", " + tableHTML;

        // Setting the file name
        downloadLink.download = filename;

        //triggering the function
        downloadLink.click();
      }
    },
    createTable() {
      let table = "<table><thead>";

      table += "<tr>";
      for (let i = 0; i < this.columns.length; i++) {
        const column = this.columns[i];
        table += "<th>";
        table += column;
        table += "</th>";
      }
      table += "</tr>";

      table += "</thead><tbody>";

      for (let i = 0; i < this.rows_data.length; i++) {
        const row = this.rows_data[i];
        table += "<tr>";
        for (let j = 0; j < Object.keys(this.rows_data[i]).length; j++) {
          table += "<td>";
          table += Object.values(this.rows_data[i])[j];
          table += "</td>";
        }
        table += "</tr>";
      }

      return (table += "</tbody></table>");
    },
    printTable: function() {
      let table = this.createTable();
      /******************** */
      let yourDOCTYPE = "<!DOCTYPE html..."; // your doctype declaration
      let printPreview = window.open("", "print_preview");
      let printDocument = printPreview.document;
      printDocument.open();
      let head =
      "<head>" +
      "<title>" +
      this.title +
      "</title>" +
      "<style>*{font-family:serif}table{border-collapse: collapse;width: 100%;} thead{background:#ddd;} td, th {border: 1px solid #000;text-align: center;padding: 10px;}</style>" +
      "</head>";

      printDocument.write(
        yourDOCTYPE +
        "<html>" +
        head +
        "<body dir=" +
        this.locale.dir +
        "><h2>" +
        this.title +
        " :</h2>" +
        table +
        "</body>" +
        "</html>"
        );
      printPreview.print();
      printPreview.close();

      /******************** */
    }
  },
  mounted() {
    this.componentId = this.generateComponentId();
  }
};
</script>


<style src="./vueye-table.scss" lang="scss" scoped>
</style>