<script setup lang="ts">
const items = [
    {
        id: 60,
        name: {
            first_name: 'Beth',
            last_name: 'Champlin',
        },
        age: 57,
        country: 'Saint Kitts and Nevis',
    },
    {
        id: 14,
        name: {
            first_name: 'Joe',
            last_name: 'Labadie',
        },
        age: 80,
        country: 'Saint Vincent and the Grenadines',
    },
    {
        id: 8,
        name: {
            first_name: 'Tierra',
            last_name: 'Walker',
        },
        age: 97,
        country: 'Mayotte',
    },
    {
        id: 88,
        name: {
            first_name: 'Diego',
            last_name: 'Baumbach',
        },
        age: 86,
        country: 'Somalia',
    },
    {
        id: 87,
        name: {
            first_name: 'Gabrielle',
            last_name: 'Ruecker',
        },
        age: 21,
        country: 'Australia',
    },
    {
        id: 15,
        name: {
            first_name: 'Rita',
            last_name: 'Volkman-Pfannerstill',
        },
        age: 56,
        country: 'Tajikistan',
    },
    {
        id: 62,
        name: {
            first_name: 'Kali',
            last_name: 'Schumm',
        },
        age: 48,
        country: 'Lithuania',
    },
    {
        id: 88,
        name: {
            first_name: 'Allan',
            last_name: 'Schuster',
        },
        age: 89,
        country: 'Hungary',
    },
    {
        id: 87,
        name: {
            first_name: 'Larry',
            last_name: 'Romaguera',
        },
        age: 79,
        country: 'Jamaica',
    },
    {
        id: 62,
        name: {
            first_name: 'Unique',
            last_name: 'Bailey',
        },
        age: 57,
        country: 'Angola',
    },
    {
        id: 4,
        name: {
            first_name: 'Jessie',
            last_name: 'Batz',
        },
        age: 31,
        country: 'Sint Maarten',
    },
]
</script>

<template>
    <div class="w-full">
        <main class="flex justify-center flex-col items-center p-4">
            <VueyeTable :data="items" :per-page="10" />
        </main>
    </div>
</template>
