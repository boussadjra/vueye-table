<script setup lang="ts">
import { Card, CardContent, CardDescription, CardTitle, CardHeader } from '../ui/card'
const features = [
    {
        title: 'Simple API',
        description: 'A simple and easy to use API that allows you to create a table in a few lines of code.',
        icon: 'i-tabler-api',
    },
    {
        title: 'Powerful Features',
        description:
            'A powerful set of features that allows you to create a table with sorting, filtering, and pagination.',
        icon: 'i-tabler-file-certificate',
    },
    {
        title: 'Customizable',
        description:
            'A customizable table that allows you to change the look and feel of the table to match your brand.',
        icon: 'i-tabler-adjustments',
    },
    {
        title: 'Responsive',
        description: 'A responsive table that works on all devices and screen sizes.',
        icon: 'i-tabler-layout',
    },
    {
        title: 'Lightweight',
        description: 'A lightweight table that is built with performance in mind.',
        icon: 'i-tabler-feather',
    },
    {
        title: 'Dark Mode',
        description: 'A dark mode that allows you to change the look and feel of the table to match your brand.',
        icon: 'i-tabler-moon',
    },
]
</script>
<template>
    <section class="py-20 sm:py-24 md:py-32">
        <div class="container mx-auto">
            <h2
                class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center text-slate-600 dark:text-slate-200 mb-8"
            >
                Features
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                <div v-for="feature in features" :key="feature.title" class="card-container p-0.5 rounded-xl">
                    <Card class="card flex z-20 flex-col items-center bg-muted relative">
                        <div class="glow -z-10">glow</div>
                        <CardHeader>
                            <CardTitle class="flex gap-2 items-center">
                                <span class="text-secondary" :class="feature.icon"></span>
                                <span class="text-muted-foreground font-semibold">{{ feature.title }}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CardDescription>{{ feature.description }}</CardDescription>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.card-container {
    background-size: 100% 100%;
    opacity: 1;
    transition: opacity 0.5s;
    animation: gradient 2s ease infinite;
}

.card-container:hover {
    background: linear-gradient(60deg, #e1583a, #c9117f, #a02de6, #0c93df);
}
.card:hover .glow {
    opacity: 0.6;
}

.glow {
    position: absolute;
    left: 0;
    top: 0;
    transform: translate(60%, 0%);
    width: 160px;
    height: 160px;
    opacity: 0;
    transition: all 1s ease;
    pointer-events: none;

    border-radius: 9999px;
    background-image: linear-gradient(45deg, #e1583a, #c9117f, #a02de6, #0c93df);
    filter: blur(60px);
}

@keyframes gradient {
    0% {
        background-position: 0% 50%;
        background-size: 200% 200%;
    }
    50% {
        background-position: 100% 50%;
        background-size: 200% 200%;
    }
    100% {
        background-position: 0% 50%;
        background-size: 200% 200%;
    }
}
</style>
