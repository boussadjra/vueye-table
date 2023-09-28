<script setup lang="ts">
defineOptions({
  name: 'AppSidebar',
});

const links = [
  {
    name: 'Basic',
    to: '/',
    children: [
      {
        name: 'Getting Started',
        to: '/getting-started',
      },
      {
        name: 'Installation',
        to: '/installation',
      },
      {
        name: 'Configuration',
        to: '/configuration',
      },
      {
        name: 'Usage',
        to: '/usage',
      },
    ],
  },
  {
    name: 'Advanced',
    to: '/advanced',
    children: [
      {
        name: 'Layouts',
        to: '/layouts',
      },
      {
        name: 'Components',
        to: '/components',
      },
      {
        name: 'Pages',
        to: '/pages',
      },
      {
        name: 'Routing',
        to: '/routing',
      },
      {
        name: 'Data Fetching',
        to: '/data-fetching',
      },
      {
        name: 'State Management',
        to: '/state-management',
      },
      {
        name: 'Internationalization',
        to: '/internationalization',
      },
      {
        name: 'Deployment',
        to: '/deployment',
      },
    ],
  },
  {
    name: 'About',
    to: '/about',
  },
];

const currentOpen = ref<number | null>(null);
const toggleOpen = (index: number) => {
  if (currentOpen.value === index) {
    currentOpen.value = null;
  } else {
    currentOpen.value = index;
  }
};
</script>
<template>
  <aside class="w-64 text-gray-600 dark:text-gray-200 p-4 fixed top-16 self-stretch">
    <nav class="w-full min-h-screen bg-primary-50 dark:bg-primary-950">
      <ul class="w-full h-full">
        <li
          v-for="(link, index) in links"
          :key="link.name"
          class="w-full items-center justify-start rounded"
          :class="{
            'border-l-4 border-primary-600 bg-primary-100 dark:bg-primary-800': link.children && index === currentOpen,
          }"
        >
          <div
            class="w-full h-full py-1 flex items-center justify-start cursor-pointer py-3 pl-4 pr-3"
            @click="toggleOpen(index)"
            :class="{
              ' bg-primary-200 dark:bg-primary-900': link.children && index === currentOpen,
            }"
          >
            <span class="i-solar-book-2-broken text-xl" />

            <span class="ml-2">{{ link.name }}</span>
            <span class="justify-self-end ml-auto i-tabler-chevron-right transition-transform" :class="[index === currentOpen ? 'rotate-90' : 'rotate-0']" />
          </div>

          <ul v-if="link.children && index === currentOpen" class="w-full h-full flex flex-col items-start justify-start ml-4">
            <li v-for="child in link.children" :key="child.name" class="w-full h-12 flex items-center justify-start">
              <RouterLink :to="child.to" class="w-full h-full flex items-center justify-start">
                <span class="i-solar-document-broken text-lg" />
                <span class="ml-2 text-sm">{{ child.name }}</span>
              </RouterLink>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped></style>
