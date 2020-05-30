<template>
  <div class="ve-table-outer-header">
    <h4>{{title}}</h4>

    <div class="ve-input-search-wrap">
      <select class="ve-input-select" v-model="filterBy" @change="selectFilterBy">
        <option value="null" disabled>Filter by</option>
        <option
          v-for="(column, index) in selectedColumns"
          :key="index"
          :value="column"
        >{{column.label}}</option>
        <option value="all">All</option>
      </select>
      <div class="ve-input-search">
        <input
          :value="value"
          v-on:input="$emit('input', $event.target.value)"
          type="text"
          class="ve-input-search-box"
          placeholder="Search ..."
        >
        <div class="ve-input-search-box-append">
          <icon name="search"/>
        </div>
      </div>
    </div>
    <div class="ve-custom-columns">
      <transition name="drop">
        <div class="ve-dropdown" v-if="toggleCustomColumns">
          <card>
            <template #header>
              <div>Columns</div>
            </template>
            <template #body>
              <ul class="ve-custom-columns-list">
                <li
                  class="ve-custom-columns-list-item"
                  v-for="(column, index) in columns"
                  :key="index"
                >
                  <label class="ve-checkbox">
                    <input
                      type="checkbox"
                      :value="column"
                      v-model="selectedColumns"
                      @change="selectColumns"
                    >
                    <span class="ve-checkmark"></span>
                  </label>
                  <span>{{column.label}}</span>
                </li>
              </ul>
            </template>
          </card>
        </div>
      </transition>
    </div>
    <div class="ve-table-outer-header-icons">
      <icon name="print" class="ve-icon" @click.native="printTable"/>
      <icon name="excel" class="ve-icon" @click.native="exportTableToExcel"/>
      <icon
        name="settings"
        class="ve-icon"
        @click.native="toggleCustomColumns=!toggleCustomColumns"
      />
    </div>
  </div>
</template>

<script>
import Icon from "../icons";
import Card from "./Card";
import { store } from "../store";
import { getDeepNestedFieldValue } from "../helpers";
export default {
  name: "ve-header",
  props: ["columns", "title", "value"],
  data() {
    return {
      toggleCustomColumns: false,
      selectedColumns: [],
      filterBy: null
    };
  },
  computed: {
    items() {
      return store.allData;
    }
  },
  methods: {
    selectColumns() {
      this.$emit("select-columns", this.selectedColumns);
    },
    selectFilterBy() {
      this.$emit("select-filter-by", this.filterBy);
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
        table += column.label;
        table += "</th>";
      }
      table += "</tr>";

      table += "</thead><tbody>";
   
      for (let i = 0; i < this.items.length; i++) {
        const row = this.items[i];
        table += "<tr>";
        for (let j = 0; j < this.columns.length; j++) {
          table += "<td>";

          let cell = getDeepNestedFieldValue(
            this.columns[j].key,
            this.items[i]
          );

          table += cell;
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
        `<head> 
      <title>` +
        this.title +
        `</title>
      <style>
* {
    font-family: serif
}

table {
    border-collapse: collapse;
    width: 100%;
}

thead {
    background: #ddd;
}

td,
th {
    border: 1px solid #000;
    text-align: center;
    padding: 10px;
}
</style>

       </head>`;

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
  components: { Icon, Card },

  mounted() {
    this.selectedColumns = this.columns.filter(col => col.display);
  }
};
</script>

<style lang="scss">
@mixin centered {
  display: flex;
  justify-content: center;
  align-items: center;
}
@mixin forSmallScreens($media) {
  @media (max-width: $media+px) {
    @content;
  }
}

.ve-table-outer-header {
  width: 100%;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;

  align-items: center;
  position: relative;
  @include forSmallScreens(640) {
    flex-direction: column;
    height: 100%;
    & > div,
    & > h4 {
      margin-bottom: 4px;
    }
  }
  &-icons {
    width: 96px;
    display: flex;
    justify-content: space-between;
  }
}

.drop-enter-active,
.drop-leave-active {
  transition: all 0.5s ease-out;
  max-height: 400px;
  //   max-width: 280px;
}

.drop-enter,
.drop-leave-to

/* .drop-leave-active below version 2.1.8 */
 {
  max-height: 0;
  opacity: 0;
  //   max-width: 0;
  transform: translateY(-200px);

  transform: scaleY(0);
}
.ve-custom-columns {
  position: absolute;
  right: 32px;
}
.ve-dropdown {
  position: absolute;
  width: 280px;
  color: #2c3e50;
  right: 0;
z-index: 20;
  .ve-card {
    background: white;
    width: 280px;
  }
}

.ve-custom-columns-list {
  display: grid;
  grid-gap: 4px;
  grid-template-columns: auto;
  &-item {
    text-align: start;
    padding: 4px;
    display: grid;
    grid-gap: 4px;
    grid-template-columns: 24px auto;
  }
}

.ve-input-search-wrap {
  @include forSmallScreens(640) {
    flex-direction: column;
    height: 100%;
  }
  @include centered();
  justify-content: space-between;
}
.ve-input-search {
  display: flex;
  align-items: center;
}
.ve-input-search-box {
  width: 280px;
  @include forSmallScreens(640) {
    width: 240px;
  }
}
.ve-input-search-box,
.ve-input-select {
  &::placeholder {
    color: #aaa;
  }

  max-width: 256px;

  color: #635e5e;
  display: block;
  height:32px;
  padding: 4px 10px;
  font-weight: 400;
  line-height: 1.5;
  background-clip: padding-box;

  border-radius: 6px;
  border: thin solid #b8b6b6;

  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  &:focus {
    outline: none;
    box-shadow: 0 0 4px #b8b6b6;
  }
  &-append {
    // background: rgba(81, 81, 81, .5);
    border-radius: 0 4px 4px 0;
    height: calc(2.25rem + 2px);
    padding: 0.375rem 0.75rem;
    margin-left: -42px;
    @include centered();
    cursor: pointer;
    svg {
      fill: #777;
    }
  }
}
</style>
