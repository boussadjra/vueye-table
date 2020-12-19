<template>
<table class="ve-table">
    <thead>
        <tr>
            <th v-if="selectRows">
                <label class="ve-checkbox">
                    <input type="checkbox" v-model="allSelected">
                    <span class="ve-checkmark" :class="{'ve-checkmark-minus':someSelected}"></span>
                </label>
            </th>
            <template v-for="(column, index) in columns">
                <template v-if="column.display">
                    <template v-if="$scopedSlots['header.cell.'+column.key]">
                        <slot :name="'header.cell.'+column.key" :columnDef="{column,sorter}"></slot>
                    </template>
                    <th v-else-if="$scopedSlots['header.'+column.key]">
                        <div>
                            <slot :name="'header.'+column.key" :column="column"></slot>
                            <icon v-if="sorter.arrowSortShown(column)" name="arrow-up" />
                        </div>
                    </th>
                    <th v-else>
                        <div class="ve-table-head-cell" :class="sorter.labelClass(column)" @click="column.sortable?sorter.handler(column):{}">
                            <span>{{column.label}}</span>
                            <icon v-if="sorter.arrowSortShown(column)" name="arrow-up" />
                        </div>
                    </th>
                </template>
            </template>

            <th v-if="expand"></th>
        </tr>
    </thead>
    <tbody name="flip-list" is="transition-group">
        <template v-if="items && items.length">
            <template v-for="(item, i) in items">
                <tr :key="item[keyTransition]?item[keyTransition]:i" class="ve-table-row-item">
                    <td v-if="selectRows">
                        <label class="ve-checkbox">
                            <input type="checkbox" :value="item" v-model="selectedRows" @change="checkRows">
                            <span class="ve-checkmark"></span>
                        </label>
                    </td>
                    <template v-for="(column, key) in columns">
                        <template v-if="column.display">
                            <template v-if="$scopedSlots['cell.'+column.key]" :data-label="column.label">
                                <slot :name="'cell.'+column.key" :item="item"></slot>
                            </template>
                            <td v-else-if="$scopedSlots[column.key]" :data-label="column.label">
                                <slot :name="column.key" :item="item"></slot>
                            </td>
                            <td v-else :data-label="column.label">{{item[column.key]}}</td>
                        </template>
                    </template>

                    <td v-if="expand">
                        <icon name="chevron-right" fill="#888" height="14px" width="14px" class="ve-table-row-expand-icon" :class="{'ve-table-row-expand-icon-open':expandRow===i}" @click.native="expandRow===i?expandRow=-1:expandRow=i" />
                    </td>
                </tr>
                <tr :key="'ex'+i" class="ve-table-row-item ve-table-row-expand" v-if="expandRow===i">
                    <td :colspan="Object.keys(item).length+1">
                        <slot name="expand" :item="item"></slot>
                    </td>
                </tr>
            </template>
        </template>

        <template v-else>
            <tr key="loading">
                <td :colspan="columns.length">
                    <div class="spinner">
                        <div class="bounce1"></div>
                        <div class="bounce2"></div>
                        <div class="bounce3"></div>
                    </div>
                </td>
            </tr>
        </template>
    </tbody>
</table>
</template>

<script>
import Icon from "../icons";
import {
    ref,
    computed,
    onMounted,
    watch,
    reactive
} from "@vue/composition-api";
import useMapper from "../@use/useMapper.js";
import useSorter from "../@use/useSorter.js";
import useFilter from "../@use/useFilter.js";

export default {
    name: "ve-grid",
    props: {
        columns: {
            type: Array,
            default: () => []
        },

        keyTransition: {
            type: String,
            default: "id"
        },
        sortBy: {
            type: String,
            default: null
        },
        filterBy: {
            type: String,
            default: null
        },
        searchValue: {
            type: String,
            default: ""
        },
        selectRows: {
            type: Boolean,
            default: false
        },
        expand: {
            type: Boolean,
            default: false
        },

        sharedState: {

            type: Object
        }
    },
    setup(props, {
        emit
    }) {
        const {
            columns,
            sortBy,
            searchValue,
            filterBy,
            selectRows
        } = props;

        const mapper = useMapper([], columns);

        const sorter = useSorter([], sortBy);
        const filter = useFilter([], searchValue, null);

        const selectedRows = ref([]);
        const allSelected = ref(false);
        const someSelected = ref(false);
        const expandRow = ref(-1);

        const items = computed(() => {
            return props.sharedState.currentPageItems;
        });

        watch(
            () => props.sharedState.allData,
            (newV, oldV) => {
                sorter.resetSortedBy();
                mapper.setNotMappedData(newV);
                filter.setItems(mapper.rows.value);

                sorter.setSortedData(mapper.rows.value);
            }
        );
        watch(
            () => props.sharedState.selectedRows,
            (newV, oldV) => {
                someSelected.value =
                    items.value.length !== newV.length && newV.length > 0;
                selectedRows.value = newV;
            }
        );
        watch(allSelected, newVal => {
            emit('mutate:selected-rows', newVal ? items.value : [])
            /* newVal
                 ?
                 mutations.setSelectedRows(items.value) :
                 mutations.setSelectedRows([]);*/
        });
        watch("columns", (newV, oldV) => {
            mapper.setColumns(newV);

            mapper.handler();

            sorter.setSortedData(mapper.rows.value);
            filter.setItems(mapper.rows.value);
        });

        watch("searchValue", (newV, oldV) => {
            filter.setSearchValue(newV);

            filter.handler();
            sorter.setSortedData(filter.filteredItems.value);
            emit('mutate:handled-data', filter.filteredItems.value)
            // mutations.setHandledData(filter.filteredItems.value);
        });

        watch("filterBy", (newV, oldV) => {
            filter.setKey(newV);

            filter.handler();
            sorter.setSortedData(filter.filteredItems.value);
            emit('mutate:handled-data', filter.filteredItems.value)
            //   mutations.setHandledData(filter.filteredItems.value);
        });
        watch(sorter.data, newVal => {
            emit('mutate:handled-data', newVal)
            //  mutations.setHandledData(newVal);
        });

        function checkRows() {
            emit('mutate:selected-rows', selectedRows.value)
            // mutations.setSelectedRows(selectedRows.value);
        }

        return {
            mapper,
            sorter,
            items,
            checkRows,
            selectedRows,
            allSelected,
            someSelected,
            expandRow
        };
    },

    components: {
        Icon
    }
};
</script>

<style>
.spinner {
    display: flex;
    /* margin: 100px auto 0; */
    width: 100%;
    justify-content: center;
    text-align: center;
}

.spinner>div {
    width: 18px;
    height: 18px;
    background-color: #333;

    border-radius: 100%;
    display: inline-block;
    -webkit-animation: sk-bouncedelay 1.4s infinite ease-in-out both;
    animation: sk-bouncedelay 1.4s infinite ease-in-out both;
}

.spinner--small>div {
    width: 8px;
    height: 8px;
}

.spinner .bounce1 {
    -webkit-animation-delay: -0.32s;
    animation-delay: -0.32s;
}

.spinner .bounce2 {
    -webkit-animation-delay: -0.16s;
    animation-delay: -0.16s;
}

@-webkit-keyframes sk-bouncedelay {

    0%,
    80%,
    100% {
        -webkit-transform: scale(0);
    }

    40% {
        -webkit-transform: scale(1);
    }
}

@keyframes sk-bouncedelay {

    0%,
    80%,
    100% {
        -webkit-transform: scale(0);
        transform: scale(0);
    }

    40% {
        -webkit-transform: scale(1);
        transform: scale(1);
    }
}
</style>
