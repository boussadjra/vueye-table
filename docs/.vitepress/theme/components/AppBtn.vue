<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
    size: {
        type: String,
        default: 'md',
        validator: (val: string) => ['sm', 'md', 'lg', 'xl'].includes(val),
    },
    color: {
        type: String,
        default: 'primary',
        validator: (val: string) =>
            ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark'].includes(val),
    },
    outline: {
        type: Boolean,
        default: false,
    },
    block: {
        type: Boolean,
        default: false,
    },
    rounded: {
        type: Boolean,
        default: false,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    tag: {
        type: String,
        default: 'button',
    },
})

const classes = computed(() => [
    'btn',
    `btn-${props.size}`,
    `btn-${props.color}`,
    {
        'btn-outline': props.outline,
        'btn-block': props.block,
        'btn-rounded': props.rounded,
        'btn-loading': props.loading,
        'btn-disabled': props.disabled,
    },
])
</script>
<template>
    <component :is="tag" :class="classes">
        <slot></slot>
    </component>
</template>

<style>
.btn {
    @apply inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-50 focus:ring-slate-500 transition duration-500 ease-in-out;
}

.btn-sm {
    @apply px-3 py-1.5 text-xs;
}

.btn-md {
    @apply px-4 py-2.5 text-sm;
}

.btn-lg {
    @apply px-5 py-3 text-base;
}

.btn-xl {
    @apply px-6 py-4 text-lg;
}

.btn-primary {
    @apply text-white bg-primary-500 border border-primary-500;
}

.btn-primary:hover {
    @apply bg-primary-600 border-primary-600;
}

.btn-primary:focus {
    @apply ring-primary-500;
}

.btn-primary:active {
    @apply bg-primary-700 border-primary-700;
}

.btn-primary.btn-outline {
    @apply text-primary-500 bg-transparent;
}

.btn-primary.btn-outline:hover {
    @apply text-white bg-primary-500 border-primary-500;
}

.btn-primary.btn-outline:focus {
    @apply ring-primary-500;
}

.btn-primary.btn-outline:active {
    @apply text-white bg-primary-500 border-primary-500;
}

.btn-secondary {
    @apply text-white bg-secondary-500 border border-secondary-500;
}

.btn-secondary:hover {
    @apply bg-secondary-600 border-secondary-600;
}

.btn-secondary:focus {
    @apply ring-secondary-500;
}

.btn-secondary:active {
    @apply bg-secondary-700 border-secondary-700;
}

.btn-secondary.btn-outline {
    @apply text-secondary-500 bg-transparent;
}

.btn-secondary.btn-outline:hover {
    @apply text-white bg-secondary-500 border-secondary-500;
}

.btn-secondary.btn-outline:focus {
    @apply ring-secondary-500;
}

.btn-secondary.btn-outline:active {
    @apply text-white bg-secondary-500 border-secondary-500;
}

.btn-success {
    @apply text-white bg-green-500 border border-green-500;
}

.btn-success:hover {
    @apply bg-green-600 border-green-600;
}

.btn-success:focus {
    @apply ring-green-500;
}

.btn-success:active {
    @apply bg-green-700 border-green-700;
}

.btn-success.btn-outline {
    @apply text-green-500 bg-transparent;
}

.btn-success.btn-outline:hover {
    @apply text-white bg-green-500 border-green-500;
}

.btn-success.btn-outline:focus {
    @apply ring-green-500;
}

.btn-success.btn-outline:active {
    @apply text-white bg-green-500 border-green-500;
}

.btn-danger {
    @apply text-white bg-red-500 border border-red-500;
}

.btn-danger:hover {
    @apply bg-red-600 border-red-600;
}

.btn-danger:focus {
    @apply ring-red-500;
}

.btn-danger:active {
    @apply bg-red-700 border-red-700;
}

.btn-danger.btn-outline {
    @apply text-red-500 bg-transparent;
}

.btn-danger.btn-outline:hover {
    @apply text-white bg-red-500 border-red-500;
}

.btn-danger.btn-outline:focus {
    @apply ring-red-500;
}

.btn-danger.btn-outline:active {
    @apply text-white bg-red-500 border-red-500;
}
</style>
