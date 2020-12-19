<template>
<div :class="`flex ${borderTop ? 'flex-col-reverse' : 'flex-col'}`">
    <div class="header flex w-full border-gray-400" :class="`${borderTop ? 'border-t' : 'border-b'}`">
        <div class="relative cursor-pointer py-2 px-6 rounded-tr rounded-tl text-gray-700 hover:text-green-700" :class="{
          ' text-green-700': currentTab === index + 1,
        }" v-for="(item, index) in items" :key="index" @click="changeTab(index,item)">
            <div>
                <slot name="item" :item="item"></slot>

                <div v-if="!$slots.item">
                    {{ item.header }}
                </div>
            </div>

            <transition :name="`slide-fade-${currentTab > prevTab ? 'right' : 'left'}`">
                <div v-if="currentTab === index + 1" :class="`${borderTop ? 'top-0' : 'bottom-0'}`" class="w-full absolute left-0 border-b-2 border-green-700 text-green-700"></div>
            </transition>
        </div>
    </div>
    <transition name=" fade">
        <div class="p-4" v-if="items[currentTab - 1].body">
            {{ items[currentTab - 1].body }}
        </div>
    </transition>
</div>
</template>

<script>
export default {
    props: {
        items: {
            type: Array,
        },
        borderTop: {
            type: Boolean,
            default: false,
        },
    },
    data() {
        return {
            currentTab: 1,
            prevTab: -1,
        };
    },
    watch: {
        currentTab(newVal, oldVal) {

            this.prevTab = oldVal;
        },
    },
    methods: {
        changeTab(index, item) {
            this.$emit('change-tab', item)
            this.currentTab = index + 1
        }
    },

};
</script>

<style>
.slide-fade-left-enter-active {
    transition: all 0.3s ease-out;
}

.slide-fade-left-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-left-enter-from {
    transform: translateX(100px);
    opacity: 0;
}

.slide-fade-right-enter-active {
    transition: all 0.3s ease-out;
}

.slide-fade-right-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-right-enter-from {
    transform: translateX(-100px);
    opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
