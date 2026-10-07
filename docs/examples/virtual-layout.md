---
aside: false
---

<script setup lang="ts">
import VirtualLayout from "../.vitepress/theme/components/VirtualLayout.vue";
</script>

# Virtual layout

Move the viewport through 10,000 items. Only the visible items and two extra items on each side
appear in the result. Measure the first rendered row at 64px to see the subsequent offsets and
total size adjust. This example supplies viewport values directly to the framework-free engine.

<VirtualLayout />

```ts
const virtual = createVirtualizer({
  count: 10_000,
  estimateSize: 32,
  overscan: 2,
  getKey: (index) => `row-${index}`,
});
virtual.setViewport(320, 160);
virtual.measure("row-8", 64);
virtual.getWindow();
```

The layout helper knows sizes and keys; your renderer owns scrolling, measurement, and accessible
row markup. See [Large datasets and virtualization](/guide/virtualization) for all options and
disabling pagination. Automatic Vue observation and virtual component props are separate work.
