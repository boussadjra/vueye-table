# Language, locale and search

Everything a table shows or announces, from "No matching rows" to "26–50 of 10,000 rows", comes
from a set of messages. English is the default; an application passes its own words, in its own
language, with numbers written in its locale.

## Words and numbers

```vue
<script setup lang="ts">
import { VueyeTable, type TableMessages } from "vueye-table";

const messages: Partial<TableMessages> = {
  searchPlaceholder: "Rechercher…",
  columns: "Colonnes",
  rowsPerPage: "Lignes par page",
  noMatchingRows: "Aucune ligne ne correspond",
  rangeStatus: ({ start, end, total }) => `${start.text}–${end.text} sur ${total.text}`,
};
</script>

<template>
  <VueyeTable :data="rows" :columns="columns" locale="fr" :messages="messages" />
</template>
```

A message that takes a number receives a `Count`: `value`, to choose a plural form, and `text`, the
number written in the table's `locale` (`1 500` in French). Whatever `messages` leaves out keeps its
English default; `defaultTableMessages` lists every key. The words are reactive: change `messages`
and the table re-renders in them.

## One language for the whole application

```ts
app.use(VueyeTablePlugin, { locale: "fr", messages });
```

Every table and grid then speaks it. A table's own `locale` and `messages` win over the plugin's,
key by key. Headless components read the same language; their `label` props still win where given.

## Ordering

Text sorts with `Intl.Collator` in the table's `locale`, with natural numbers (`2` before `10`) and
without regard to case or accents. `NaN` sorts with the empty values, last in both directions. The
locale is read when the table is created; give the table a new `key` to change it.

## Search and text filters

Search and text filters compare text through `normalizeText`. The default, `foldText`, ignores
case, accents and Arabic vowel marks, and reads each Arabic letter in one shape, so `benali` finds
`Bénali` and `احمد` finds `أحمد`. Pass your own to match how your server searches:

```vue
<VueyeTable :data="rows" :columns="columns" :normalize-text="(text) => text.toLowerCase()" />
```

`filterRows` takes the same function as its last argument, so a server can filter exactly as the
table does.
