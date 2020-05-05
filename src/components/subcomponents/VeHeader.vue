<template>
  <div class="ve-table-outer-header">
    <h4>{{title}}</h4>
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
  props: ["columns", "title"],
  data() {
    return {
      toggleCustomColumns: false,
      selectedColumns: []
    };
  },
  methods: {
    selectColumns() {
      this.$emit("select-columns", this.selectedColumns);
    }
  },
  components: { Icon, Card },

  mounted() {
    this.selectedColumns = this.columns.filter(col => col.display);
  }
};
</script>

<style lang="scss">
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
</style>
