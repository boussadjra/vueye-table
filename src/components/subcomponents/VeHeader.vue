<template>
  <div class="ve-table-outer-header">
    <h4>{{title}}</h4>

     <div class="ve-input-search-wrap">
     <select class="ve-input-select" v-model="filterBy" @change="selectFilterBy" >
     <option value="null" disabled>Filter by</option>
       <option  v-for="(column, index) in selectedColumns" :key="index" :value="column">
       {{column.label}}
       </option>
     <option value="all">All</option>

     </select>
        <input   v-bind:value="value"
      v-on:input="$emit('input', $event.target.value)" type="text" class="ve-input-search-input" placeholder="Search ...">
        <div class="ve-input-search-input-append">
          <icon name="search"/>
        </div>
      </div>
    <div class="ve-custom-columns">
      <icon
        name="settings"
        class="ve-icon"
        @click.native="toggleCustomColumns=!toggleCustomColumns"
      />
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
  </div>
</template>

<script>
import Icon from "../icons";
import Card from "./Card";
export default {
  name: "ve-header",
  props: ["columns", "title","value"],
  data() {
    return {
      toggleCustomColumns: false,
      selectedColumns: [],
      filterBy:null
    };
  },
 

  methods: {
    selectColumns() {
      this.$emit("select-columns", this.selectedColumns);
    },
    selectFilterBy(){
      this.$emit("select-filter-by", this.filterBy);

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


.ve-table-outer-header {
  width: 100%;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;

  align-items: center;
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
  position: relative;
}
.ve-dropdown {
  position: absolute;
  width: 280px;
  color: #2c3e50;
  right: 0;

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
            @include centered();
         justify-content: space-between;

        }

        .ve-input-search-input{
            width: 280px;

        }
        .ve-input-search-input,.ve-input-select {
            &::placeholder {
                color: #aaa
            }
           
            max-width: 300px;

            color: #635e5e;
            display: block;
            height: calc(2.25rem + 2px);
            padding: .375rem .75rem;
            font-size: 1rem;
            font-weight: 400;
            line-height: 1.5;
            background-clip: padding-box;
       
            border-radius:6px;
            border: thin solid #b8b6b6;

            transition: border-color .15s ease-in-out,
            box-shadow .15s ease-in-out;
            &:focus{
              outline: none;
              box-shadow: 0 0 4px #b8b6b6;
            }
            &-append {
                // background: rgba(81, 81, 81, .5);
                border-radius: 0 4px 4px 0;
                height: calc(2.25rem + 2px);
                padding: .375rem .75rem;
                margin-left: -42px;
                @include centered();
                cursor: pointer;
                svg{
                  fill:#777;
                }
            }
        }

</style>
