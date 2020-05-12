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
        <span>
          {{lowerBound}}
          <strong>-</strong>
          {{upperBound}} of {{notPagedData.length}}
        </span>
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
import { store, mutations } from "../store";

export default {
  name: "ve-pagination",
  props: ["perPageValues", "perPage"],
  setup(props, context) {
    const { perPage } = props;
    const {
      pages,
      pagesCount,
      currentPage,
      next,
      prev,
      last,
      first,
      currentPageItems,
      setPerPage,
      notPagedData,
      setNotPagedData
    } = usePaginator([], perPage);

    const nbRowPerPage = ref(perPage);

    watch(
      () => store.allData,
      (newVal, oldVal) => {
        setNotPagedData(newVal);
      }
    );

    watch(
      () => store.handledData,
      (newVal, oldVal) => {
        setNotPagedData(newVal);
      }
    );
    watch(currentPage, () => {
      context.emit("update-page", currentPageItems, setNotPagedData);
    });

    watch(nbRowPerPage, newVal => {
      setPerPage(newVal);
      context.emit("update-page", currentPageItems, setNotPagedData);
    });

    watch(currentPageItems, newVal => {
      mutations.setCurrentPageItems(newVal);
    });
    const allData = computed(() => {
      return store.allData;
    });
    const lowerBound = computed(() => {
      return (currentPage.value - 1) * nbRowPerPage.value + 1;
    });
    const upperBound = computed(() => {
      return currentPage.value * nbRowPerPage.value > notPagedData.value.length
        ? notPagedData.value.length
        : currentPage.value * nbRowPerPage.value;
    });

    return {
      allData,
      nbRowPerPage,
      next,
      prev,
      last,
      first,
      upperBound,
      lowerBound,
      notPagedData,
      pagesCount
    };
  },
  components: {
    Icon
  }
};
</script>

<style lang="scss">
@mixin forSmallScreens($media) {
  @media (max-width: $media+px) {
    @content;
  }
}

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

  @include forSmallScreens(640) {
    flex-direction: column;
    height: 100%;
    & > div {
      margin-bottom: 10px;
    }
  }
}
</style>
