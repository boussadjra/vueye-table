<script setup lang="ts">
import users from '@/assets/data/users.json'

const basicUsers = computed(() =>
    users.map((user) => {
        return {
            name: user.name,
            email: user.email,
            address: {
                city: user.address.city,
                street: user.address.street,
                suite: user.address.suite,
                zipCode: user.address.zipcode,
            },
        }
    })
)
</script>

<template>
    <section class="basic-demo not-prose max-w-96">
        <div class="text-sm">
            <VueyeTable :data="basicUsers" />
        </div>
    </section>
</template>
