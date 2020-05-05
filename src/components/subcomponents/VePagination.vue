<template>
  <div class="ve-pagination">
    <div class="ve-pagination-perpage">
      <span>Number of rows per page</span>
      <select v-model="nbRowPerPage">
        <option v-for="ppval in perPageValues " :value="ppval" :key="ppval">{{ppval}}</option>
      </select>
    </div>
    <div class="ve-pagination-page-desc">
      <span>
        <span> {{lowerBound}} <strong>-</strong> {{upperBound}} of {{data.length}} </span>
      </span>
    </div>
    <div class="ve-pagination-arrows">
      <icon class="ve-icon" name="step-backward" @click.native="first"/>
      <icon class="ve-icon" name="chevron-left" @click.native="prev"/>
      <icon class="ve-icon" name="chevron-right" @click.native="next"/>
      <icon class="ve-icon" name="step-forward" @click.native="last"/>
    </div>
  </div>
</template>

<script>
import Icon from "../icons";
import { ref, watch, computed } from "@vue/composition-api";
import usePaginator from "../@use/usePaginator.js";

export default {
  name: "ve-pagination",
  props: ["perPageValues", "data", "perPage"],
  setup(props, context) {
    const { data, perPage } = props;
    const {
      pages,
      pagesCount,
      currentPage,
      next,
      prev,
      last,
      first,
      currentPageItems,
      setPerPage
    } = usePaginator(data, perPage);

    const nbRowPerPage = ref(perPage);

    watch(currentPage, () => {
      context.emit("update-page", currentPageItems);
    });

    watch(nbRowPerPage, newVal => {
      setPerPage(newVal);
      context.emit("update-page", currentPageItems);
    });

    const lowerBound = computed(() => {
      
      return (currentPage.value-1) * nbRowPerPage.value + 1;
    });
    const upperBound = computed(() => {
      return (currentPage.value ) * nbRowPerPage.value > data.length
        ? data.length
        : (currentPage.value) * nbRowPerPage.value;
    });

    return { nbRowPerPage, next, prev, last, first,upperBound,lowerBound,pagesCount };
  },
  components: {
    Icon
  }
};
</script>

<style lang="scss">
.ve-pagination {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;

  padding: 20px;

  font-size: 11pt;
  & > div {
    margin-right: 35px;
  }
  select {
    border-radius: 4px;
    padding: 4px;
    margin-left: 4px;
  }
  &-arrows {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 8px;

    svg {
      fill: #444;
      height: 16px;
      width: 16px;
      cursor: pointer;
    }
  }
}
</style>
