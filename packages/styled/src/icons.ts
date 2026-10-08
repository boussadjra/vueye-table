import { h, type VNode } from "vue";

const paths = {
  sortNone: "M7 9l5-5 5 5M7 15l5 5 5-5",
  sortAsc: "M7 14l5-5 5 5",
  sortDesc: "M7 10l5 5 5-5",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2-4.35-4.35",
  columns: "M4 4h6v16H4zM14 4h6v16h-6z",
  empty: "M3 7h18M3 12h18M3 17h10",
  expand: "M9 5l7 7-7 7",
  collapse: "M5 9l7 7 7-7",
} as const;

export type IconName = keyof typeof paths;

/** A 24-pixel stroke icon that inherits the text color. */
export function icon(name: IconName, className = "vt-icon"): VNode {
  return h(
    "svg",
    {
      class: className,
      viewBox: "0 0 24 24",
      width: 16,
      height: 16,
      fill: "none",
      stroke: "currentColor",
      "stroke-width": 2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      focusable: "false",
    },
    [h("path", { d: paths[name] })],
  );
}
