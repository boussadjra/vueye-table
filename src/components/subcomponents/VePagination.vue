<template>
<div class="ve-pagination">
    <div class="ve-pagination-perpage">
        <span>{{config.nbRowsPerPage}}</span>
        <select v-model="nbRowPerPage">
            <option v-for="ppval in perPageValues " :value="ppval" :key="ppval">{{ppval}}</option>
        </select>
    </div>
    <div v-if="server && server.total===null" class="ve-pagination-page-desc">
        <div class="spinner spinner--small">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
        </div>
    </div>
    <div v-else class="ve-pagination-page-desc">
        <span>
            <span>
                {{lowerBound}}
                <strong>-</strong>
                {{upperBound}} {{config.of}} {{server?server.total:notPagedData.length}}
            </span>
        </span>
    </div>
    <div class="ve-pagination-arrows">
        <icon class="ve-icon" name="step-backward" @click.native="first" />
        <icon class="ve-icon" name="chevron-left" @click.native="prev" />
        <icon class="ve-icon" name="chevron-right" @click.native="next" />
        <icon class="ve-icon" name="step-forward" @click.native="last" />
    </div>
</div>
</template>

<script>
import Icon from "../icons";
import {
    ref,
    watch,
    computed
} from "@vue/composition-api";
import usePaginator from "../@use/usePaginator.js";

export default {
    name: "ve-pagination",
    props: ["perPageValues", "perPage", "config", "server", "sharedState"],
    setup(props, context) {
        const {
            perPage,
            server
        } = props;
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
        } = usePaginator([], perPage, server);

        const nbRowPerPage = ref(perPage);

        watch(
            () => props.sharedState.allData,
            (newVal, oldVal) => {
                setNotPagedData(newVal);
            }
        );

        watch(
            () => props.sharedState.handledData,
            (newVal, oldVal) => {
                setNotPagedData(newVal);
            }
        );
        watch(currentPage, () => {

            context.emit("update-page", currentPageItems, currentPage, nbRowPerPage);
        });

        watch(nbRowPerPage, newVal => {
            setPerPage(newVal);
            context.emit("update-page", currentPageItems, currentPage, nbRowPerPage);
        });

        watch(currentPageItems, newVal => {
            //   mutations.setCurrentPageItems(newVal);
            context.emit('mutate:current-page-items', newVal)
        });
        const allData = computed(() => {
            return props.sharedState.allData;
        });
        const lowerBound = computed(() => {
            return (currentPage.value - 1) * nbRowPerPage.value + 1;
        });
        const upperBound = computed(() => {
            return currentPage.value * nbRowPerPage.value > notPagedData.value.length && !server ?
                notPagedData.value.length :
                currentPage.value * nbRowPerPage.value;
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

    &>div {
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

        &>div {
            margin-bottom: 10px;
        }
    }
}
</style>
