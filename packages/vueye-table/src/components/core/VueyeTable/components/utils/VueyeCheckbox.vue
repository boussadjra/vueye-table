<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
    inheritAttrs: false,
})

const props = defineProps({
    checked: Boolean,
    id: String,
    label: String,
    indeterminate: Boolean,
    modelValue: [Boolean, Array],
})

const emit = defineEmits(['change', 'update:modelValue'])

const checked = ref(props.modelValue)

const model = computed({
    get() {
        return props.modelValue
    },
    set(value) {
        emit('update:modelValue', value)
    },
})

const onCheckChange = (event: any) => {
    emit('change', event)
}
</script>

<template>
    <div
        class="table__checkbox"
        :class="{ 'table__checkbox--checked': checked, 'table__checkbox--indeterminate': indeterminate }"
    >
        <input
            :id="id"
            type="checkbox"
            :checked="checked"
            v-model="model"
            :indeterminate="indeterminate"
            @change="onCheckChange"
            aria-labelledby="checkboxLabel"
            v-bind="$attrs"
        />
        <label :for="id" id="checkboxLabel">{{ label }}</label>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
            <g fill="none" stroke="currentColor" stroke-width="1.5">
                <!-- rounded square -->
                <path
                    class="rounded-square"
                    d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2c4.714 0 7.071 0 8.535 1.464C22 4.93 22 7.286 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z"
                />
                <!-- checkmark -->
                <path class="checkmark" stroke-linecap="round" stroke-linejoin="round" d="m8.5 12.5l2 2l5-5" />
                <!-- indeterminate -->
                <path class="indeterminate" stroke-linecap="round" stroke-linejoin="round" d="M6 12h12" />
            </g>
        </svg>
    </div>
</template>

<style>
.table__checkbox {
    position: relative;
}

.table__checkbox input[type='checkbox'] {
    position: absolute;
    width: 1.5rem;
    height: 1.5rem;
    inset-inline-start: 0;
    top: 0;
    cursor: pointer;
    z-index: 10;
    opacity: 0;
}

.table__checkbox svg {
    position: absolute;
    z-index: 0;
    top: 0;
    start: 0;
    width: 1.5rem;
    height: 1.5rem;
    transition: transform 0.2s ease-in-out;
}

.table__checkbox .checkmark,
.table__checkbox .indeterminate {
    transform: scale(0);
    transform-origin: 50% 50%;
    animation: zoom-in-out 0.2s ease-in-out;
}

.table__checkbox input[type='checkbox']:indeterminate ~ svg .indeterminate {
    transform: scale(1);
}

.table__checkbox input[type='checkbox']:checked ~ svg .checkmark {
    transform: scale(1);
}

@keyframes zoom-in-out {
    50% {
        transform: scale(0.9);
    }
}
</style>
