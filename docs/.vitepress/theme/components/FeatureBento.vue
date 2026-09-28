<script setup lang="ts">
import { tokenize } from "../json";

/*
 * What the engine does, one tile per idea. The pictures are static markup: the live demo above
 * already runs the real components.
 */

const sheet = [
  ["Keyboard", "2", "129.00", "258.00"],
  ["Monitor", "1", "349.50", "349.50"],
  ["Support", "12", "15.00", "180.00"],
  ["Cables", "6", "9.25", "55.50"],
];
const keys = ["↑", "↓", "←", "→", "Shift", "Enter", "F2", "Delete", "Esc"];
const attributes = [
  'role="grid"',
  "aria-sort",
  "aria-selected",
  "aria-rowindex",
  "aria-colindex",
  "aria-activedescendant",
  "aria-multiselectable",
  'aria-live="polite"',
];

const state = Object.entries({
  sorting: [{ column: "salary", direction: "desc" }],
  search: "lov",
  pagination: { page: 2, pageSize: 10 },
  selection: [4, 9],
}).map(([key, value]) => ({ key, tokens: tokenize(JSON.stringify(value)) }));

function inRange(row: number, column: number): boolean {
  return row >= 1 && row <= 2 && column >= 1 && column <= 2;
}

function onPointerMove(event: PointerEvent): void {
  const tile = event.target instanceof Element ? event.target.closest<HTMLElement>(".tile") : null;
  if (!tile) {
    return;
  }
  const rect = tile.getBoundingClientRect();
  tile.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  tile.style.setProperty("--my", `${event.clientY - rect.top}px`);
}
</script>

<template>
  <section class="vy-section vy-features" aria-labelledby="vy-features-title">
    <header class="vy-section-head">
      <p class="vy-kicker">What it does</p>
      <h2 id="vy-features-title" class="vy-h2">
        Built like a spreadsheet. <em>Shaped</em> like Vue.
      </h2>
    </header>

    <div class="bento" @pointermove="onPointerMove">
      <article class="tile keyboard">
        <div class="copy">
          <h3>Keyboard-first spreadsheet</h3>
          <p>
            Arrows move and Shift extends the range. Enter or F2 edits, and copy, cut, paste,
            Delete, undo, and redo work the way they do in a spreadsheet.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <div class="sheet">
            <span class="corner" />
            <span v-for="letter in ['A', 'B', 'C', 'D']" :key="letter" class="head">{{
              letter
            }}</span>
            <template v-for="(line, row) in sheet" :key="row">
              <span class="head">{{ row + 1 }}</span>
              <span
                v-for="(value, column) in line"
                :key="column"
                class="cell"
                :class="{
                  range: inRange(row, column),
                  cursor: row === 1 && column === 1,
                  number: column > 0,
                }"
                >{{ value }}</span
              >
            </template>
          </div>
          <div class="keys">
            <kbd v-for="key in keys" :key="key">{{ key }}</kbd>
          </div>
        </div>
      </article>

      <article class="tile typed">
        <div class="copy">
          <h3>Typed to the leaf</h3>
          <p>
            Column ids are typed paths into your rows, so <code>format</code> on a salary receives a
            number.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <div class="editor">
            <div><span class="fn">defineColumns</span>&lt;<span class="type">User</span>&gt;([</div>
            <div class="indent">
              { id: <span class="string">"name.<span class="caret" />"</span> },
            </div>
            <div>])</div>
            <ul class="suggest">
              <li class="on"><span>name.first</span><em>string</em></li>
              <li><span>name.last</span><em>string</em></li>
            </ul>
          </div>
        </div>
      </article>

      <article class="tile server">
        <div class="copy">
          <h3>Server-driven when you need it</h3>
          <p>
            Add <code>manual</code> and <code>row-count</code>, and your server searches, sorts, and
            pages. The table presents whatever page comes back.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <div class="wire">
            <div class="request">
              <span class="verb">GET</span>
              <span>/api/people?page=3&amp;sort=-salary</span>
            </div>
            <div class="response">
              <span class="code-ok">200</span>
              <span>rows 51–75 of 1,284</span>
            </div>
            <div class="bar"><span /></div>
          </div>
        </div>
      </article>

      <article class="tile state">
        <div class="copy">
          <h3>State is plain data</h3>
          <p>
            Sorting, search, filters, pages, and selection serialize as they are. Save them, restore
            them, or keep them in the URL.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <div class="json">
            <div class="punctuation">{</div>
            <div v-for="(line, index) in state" :key="line.key" class="json-line">
              <span class="key">"{{ line.key }}"</span><span class="punctuation">: </span
              ><span v-for="(token, position) in line.tokens" :key="position" :class="token.kind">{{
                token.text
              }}</span
              ><span v-if="index < state.length - 1" class="punctuation">,</span>
            </div>
            <div class="punctuation">}</div>
          </div>
        </div>
      </article>

      <article class="tile immutable">
        <div class="copy">
          <h3>Never mutates your data</h3>
          <p>
            Every edit, undo, and redo arrives as a new array. Rows you did not touch are shared,
            not copied.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <div class="arrays">
            <div class="array">
              <span class="label">data</span>
              <span class="item" /><span class="item" /><span class="item" /><span class="item" />
              <span class="tag">frozen</span>
            </div>
            <div class="links"><i /><i class="changed" /><i /><i /></div>
            <div class="array next">
              <span class="label">next</span>
              <span class="item" /><span class="item changed" /><span class="item" /><span
                class="item"
              />
              <span class="tag">new</span>
            </div>
          </div>
        </div>
      </article>

      <article class="tile accessible">
        <div class="copy">
          <h3>Accessible markup, with or without styles</h3>
          <p>
            The headless layer renders roles, states, and a polite live status. Focus in the
            spreadsheet moves with <code>aria-activedescendant</code>, so screen readers follow the
            active cell.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <ul class="chips">
            <li v-for="attribute in attributes" :key="attribute">{{ attribute }}</li>
          </ul>
        </div>
      </article>

      <article class="tile rendered">
        <div class="copy">
          <h3>Rendered on the server, ready for Nuxt</h3>
          <p>
            No package reads a browser global, and a check enforces it on every commit. The Nuxt
            module auto-imports the components and composables and adds the stylesheet.
          </p>
        </div>
        <div class="visual" aria-hidden="true">
          <pre class="config"><span class="comment">// nuxt.config.ts</span>
<span class="fn">export default</span> <span class="fn">defineNuxtConfig</span>({
  modules: [<span class="string">"@vueye-table/nuxt"</span>],
})</pre>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.bento {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.tile {
  --mx: 50%;
  --my: 0%;

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
  padding: 26px;
  overflow: hidden;
  background: var(--vy-card);
  border: 1px solid var(--vy-card-border);
  border-radius: var(--vy-radius-lg);
  isolation: isolate;
}

.tile::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(
    480px circle at var(--mx) var(--my),
    rgb(160 45 230 / 0.12),
    transparent 45%
  );
  opacity: 0;
  transition: opacity 0.4s;
}

.tile::after {
  content: "";
  position: absolute;
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: radial-gradient(
    320px circle at var(--mx) var(--my),
    rgb(201 17 127 / 0.7),
    rgb(160 45 230 / 0.35) 40%,
    transparent 70%
  );
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}

.tile:hover::before,
.tile:hover::after {
  opacity: 1;
}

.keyboard,
.accessible {
  grid-column: span 4;
}

.typed,
.immutable {
  grid-column: span 2;
}

.server,
.state {
  grid-column: span 3;
}

.rendered {
  grid-column: span 6;
}

.keyboard,
.rendered {
  flex-direction: row;
  align-items: center;
  gap: 32px;
}

.keyboard .copy,
.rendered .copy {
  flex: 0 1 36%;
}

.keyboard .visual,
.rendered .visual {
  flex: 1 1 auto;
  margin-top: 0;
}

.copy h3 {
  font-size: 19px;
  font-weight: 650;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--vp-c-text-1);
}

.copy p {
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.copy code {
  padding: 0.1em 0.35em;
  white-space: nowrap;
  font-family: var(--vp-font-family-mono);
  font-size: 0.88em;
  color: var(--vp-code-color);
  background: var(--vp-code-bg);
  border-radius: 5px;
}

.visual {
  position: relative;
  min-width: 0;
  margin-top: auto;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}

/* Keyboard: a small sheet with a range and a cursor. */

.sheet {
  display: grid;
  grid-template-columns: 28px 1.5fr repeat(3, 1fr);
  overflow: hidden;
  background: var(--vp-c-bg);
  border: 1px solid var(--vy-card-border);
  border-radius: 12px;
}

.sheet > span {
  padding: 8px 10px;
  border-right: 1px solid var(--vy-card-border);
  border-bottom: 1px solid var(--vy-card-border);
  white-space: nowrap;
}

.sheet .head,
.sheet .corner {
  font-size: 11px;
  text-align: center;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-alt);
}

.sheet .cell {
  color: var(--vp-c-text-1);
}

.sheet .number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sheet .range {
  background: rgb(160 45 230 / 0.12);
}

.sheet .cursor {
  position: relative;
  box-shadow: inset 0 0 0 2px #a02de6;
}

.sheet .cursor::after {
  content: "";
  position: absolute;
  right: -4px;
  bottom: -4px;
  z-index: 1;
  width: 7px;
  height: 7px;
  background: var(--vy-orange);
  border: 1.5px solid var(--vp-c-bg);
}

.keys {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

kbd {
  min-width: 30px;
  padding: 4px 9px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  text-align: center;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vy-card-border);
  border-bottom-width: 3px;
  border-radius: 8px;
}

/* Typed paths: an editor with completions. */

.editor {
  position: relative;
  padding: 14px 16px 16px;
  line-height: 1.75;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vy-card-border);
  border-radius: 12px;
}

.editor .indent {
  padding-left: 2ch;
}

.fn {
  color: #7a3fd6;
}

.type {
  color: #0a6fb0;
}

.dark .fn {
  color: #cba6f7;
}

.dark .type {
  color: #6fd0ff;
}

.caret {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin: 0 1px -0.2em;
  background: var(--vp-c-text-1);
  animation: blink 1.1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.suggest {
  position: absolute;
  top: calc(100% - 22px);
  left: 88px;
  z-index: 1;
  min-width: 170px;
  padding: 4px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  box-shadow: 0 16px 32px -12px rgb(10 5 20 / 0.35);
}

.suggest li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 8px;
  color: var(--vp-c-text-1);
  border-radius: 6px;
}

.suggest li.on {
  background: rgb(160 45 230 / 0.14);
}

.suggest em {
  font-style: normal;
  color: var(--vp-c-text-3);
}

.typed .visual {
  margin-bottom: 44px;
}

/* State: JSON, and the Nuxt config. */

.json,
.config {
  margin: 0;
  padding: 14px 16px;
  overflow-x: auto;
  line-height: 1.7;
  white-space: pre;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vy-card-border);
  border-radius: 12px;
}

.json {
  white-space: pre-wrap;
}

.json-line {
  padding-left: 2ch;
}

.key {
  color: #7a3fd6;
}

.string {
  color: #b8401f;
}

.number,
.literal {
  color: #0a6fb0;
}

.punctuation,
.comment {
  color: var(--vp-c-text-3);
}

.dark .key {
  color: #cba6f7;
}

.dark .string {
  color: #ffb38a;
}

.dark :is(.number, .literal) {
  color: #6fd0ff;
}

/* Server: a request and its page. */

.wire {
  display: grid;
  gap: 8px;
}

.request,
.response {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  overflow: hidden;
  white-space: nowrap;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vy-card-border);
  border-radius: 10px;
}

.verb,
.code-ok {
  flex: none;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 5px;
}

.verb {
  color: #fff;
  background: #0a6fb0;
}

.code-ok {
  color: #04331f;
  background: #37d399;
}

.response {
  margin-left: 24px;
}

.bar {
  height: 6px;
  margin: 6px 0 0 24px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  border-radius: 999px;
}

.bar span {
  display: block;
  width: 38%;
  height: 100%;
  background: var(--vy-gradient);
  border-radius: inherit;
  animation: load 2.8s var(--vy-ease) infinite;
}

@keyframes load {
  0% {
    transform: translateX(-100%);
  }

  60%,
  100% {
    transform: translateX(270%);
  }
}

/* Immutable: two arrays sharing rows. */

.arrays {
  display: grid;
  gap: 4px;
}

.array,
.links {
  display: grid;
  grid-template-columns: 44px repeat(4, minmax(0, 1fr)) 58px;
  align-items: center;
  gap: 6px;
}

.array .label {
  color: var(--vp-c-text-2);
}

.array .item {
  height: 30px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vy-card-border);
  border-radius: 7px;
}

.array .item.changed {
  background: rgb(160 45 230 / 0.2);
  border-color: #a02de6;
  box-shadow: 0 0 18px -4px rgb(160 45 230 / 0.6);
}

.array .tag {
  justify-self: start;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-default-soft);
  border-radius: 999px;
}

.array.next .tag {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.links {
  height: 20px;
}

.links::before {
  content: "";
}

.links i {
  justify-self: center;
  width: 1px;
  height: 100%;
  background: repeating-linear-gradient(to bottom, var(--vp-c-text-3) 0 3px, transparent 3px 6px);
}

.links i.changed {
  width: 2px;
  background: var(--vy-gradient);
}

/* Accessible: the attributes the headless layer writes. */

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips li {
  padding: 6px 11px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vy-card-border);
  border-radius: 8px;
}

.chips li:nth-child(3n + 1) {
  border-color: rgb(160 45 230 / 0.4);
}

.chips li:nth-child(3n + 2) {
  border-color: rgb(12 147 223 / 0.4);
}

.chips li:nth-child(3n) {
  border-color: rgb(201 17 127 / 0.4);
}

@media (max-width: 959px) {
  .bento {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tile {
    grid-column: span 2;
  }

  .typed,
  .server {
    grid-column: span 1;
  }

  .keyboard,
  .rendered {
    flex-direction: column;
    align-items: stretch;
    gap: 22px;
  }

  .keyboard .visual,
  .rendered .visual {
    margin-top: auto;
  }
}

@media (max-width: 639px) {
  .bento {
    grid-template-columns: minmax(0, 1fr);
  }

  .tile,
  .typed,
  .server {
    grid-column: auto;
  }

  .tile {
    padding: 22px;
  }

  .sheet {
    grid-template-columns: 24px 1.4fr repeat(3, 1fr);
    font-size: 11px;
  }

  .sheet > span {
    padding: 7px 6px;
  }
}
</style>
