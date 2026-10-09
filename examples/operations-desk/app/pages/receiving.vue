<script setup lang="ts">
import { ref } from "vue";
const count = ref(1000);
const active = ref(false);
const revision = ref(0);
const fail = ref(false);
const connections = ref<number>();
function start() {
  active.value = true;
  revision.value++;
}
async function checkConnections() {
  const health = await $fetch<{ activeStreams: number }>("/api/health");
  connections.value = health.activeStreams;
}
</script>

<template>
  <section>
    <h1>Live receiving</h1>
    <p>
      Read real HTTP delivery events as they arrive. Arabic and accented notes cross network chunks;
      HTML-looking notes must remain text. Stop or leave this page to close the connection.
    </p>
    <div class="controls">
      <label
        >Deliveries
        <select v-model.number="count" :disabled="active">
          <option :value="1000">1,000</option>
          <option :value="10000">10,000</option>
        </select></label
      ><label><input v-model="fail" type="checkbox" :disabled="active" /> Fail connection</label
      ><button class="primary" @click="start">
        {{ active ? "Restart receiving" : "Start receiving" }}</button
      ><button :disabled="!active" @click="active = false">Stop receiving</button
      ><button @click="checkConnections">Check open connections</button>
    </div>
    <p v-if="connections !== undefined" class="notice" role="status">
      {{ connections }} receiving connections open on the server.
    </p>
    <ReceivingFeed v-if="active" :key="revision" :count="count" :fail="fail" />
    <p v-else class="notice">Receiving is stopped. Start a session to load deliveries.</p>
  </section>
</template>
