import type { TableColumn, TableGroup, TableRenderItem } from "@vueye-table/core";
import { injectDataTable, useTableLocale } from "@vueye-table/vue";
import {
  defineComponent,
  h,
  type PropType,
  type SlotsType,
  type VNode,
  type VNodeChild,
  type ComponentPublicInstance,
} from "vue";

import { injectColumnLayout } from "./column-layout";
import { injectRowLayout } from "./row-layout";
import { asProp, columnProp, injectColumnOffset } from "./shared";
import { injectVirtual, physicalColumnCount, renderColumns } from "./virtual";

export interface GroupSlotProps {
  readonly group: TableGroup;
  readonly label: string;
  readonly toggle: () => void;
}
export interface AggregateSlotProps {
  readonly group: TableGroup;
  readonly column: TableColumn<unknown>;
  readonly value: unknown;
  readonly display: string;
}
export type GroupSlots = { group?: (props: GroupSlotProps) => VNodeChild } & {
  [key: `aggregate.${string}`]: ((props: AggregateSlotProps) => VNodeChild) | undefined;
};
const groupProp = { type: Object as PropType<TableGroup>, required: true } as const;

export const DataTableAggregateCell = defineComponent({
  name: "DataTableAggregateCell",
  props: { group: groupProp, column: columnProp, as: asProp("td") },
  slots: Object as SlotsType<{ default?: (props: AggregateSlotProps) => VNodeChild }>,
  setup(props, { slots }) {
    const layout = injectColumnLayout();
    const table = injectDataTable("<DataTableAggregateCell>");
    const offset = injectColumnOffset();
    return () =>
      h(
        props.as,
        {
          "data-aggregate": props.column.id,
          "aria-readonly": props.as === "td" ? "true" : undefined,
          "data-align": props.column.align,
          "aria-colindex":
            props.as === "td" ? table.columns.indexOf(props.column) + offset() + 1 : undefined,
          ...(props.as === "td" ? layout?.attrs(props.column) : {}),
        },
        props.column.aggregate
          ? (slots.default?.({
              group: props.group,
              column: props.column,
              value: props.group.getAggregate(props.column.id),
              display: props.group.getAggregateDisplay(props.column.id),
            }) ?? props.group.getAggregateDisplay(props.column.id))
          : undefined,
      );
  },
});

/** A read-only structural row; aggregate cells use the same native column layout as data cells. */
export const DataTableGroupRow = defineComponent({
  name: "DataTableGroupRow",
  props: {
    group: groupProp,
    footer: { type: Boolean, default: false },
    itemKey: { type: String, default: undefined },
    aggregates: { type: Boolean, default: true },
  },
  slots: Object as SlotsType<GroupSlots>,
  setup(props, { slots }) {
    const table = injectDataTable("<DataTableGroupRow>");
    const locale = useTableLocale();
    const offset = injectColumnOffset();
    const virtual = injectVirtual();
    const layout = injectRowLayout();
    return () => {
      const { group } = props;
      const label = locale().messages.groupLabel(
        table.getColumn(group.columnId)?.header ?? group.columnId,
        String(group.value),
        locale().count(group.leafCount),
      );
      const toggle = (): void => table.toggleGroup(group.key);
      const content = props.footer
        ? locale().messages.groupTotals(label)
        : [
            table.selectionMode !== "none"
              ? h("input", {
                  type: "checkbox",
                  checked: group.selection === "all",
                  indeterminate: group.selection === "some",
                  "aria-label": locale().messages.selectGroup(label),
                  onChange: (event: Event) =>
                    table.toggleGroupSelection(
                      group.key,
                      (event.target as HTMLInputElement).checked,
                    ),
                })
              : null,
            h(
              "button",
              {
                type: "button",
                "aria-expanded": String(group.isExpanded),
                "aria-label": (group.isExpanded
                  ? locale().messages.collapseGroup
                  : locale().messages.expandGroup)(label),
                onClick: toggle,
                onKeydown: (event: KeyboardEvent) => event.stopPropagation(),
              },
              slots.group?.({ group, label, toggle }) ?? label,
            ),
          ];
      const aggregate = (column: TableColumn<unknown>, as = "td"): VNode =>
        h(
          DataTableAggregateCell,
          { key: column.id, group, column, as },
          { default: slots[`aggregate.${column.id}`] },
        );
      const hasAggregates = props.aggregates && table.columns.some((column) => column.aggregate);
      const labelCell = h(
        "td",
        {
          "data-group-label": "",
          "aria-readonly": "true",
          colspan: hasAggregates
            ? offset() + 1
            : physicalColumnCount(virtual, table.columns.length, offset()),
          style: { "--vt-group-depth": group.depth },
        },
        [
          h("div", { class: "vt-group-label-content" }, content),
          hasAggregates && table.columns[0]?.aggregate ? aggregate(table.columns[0], "span") : null,
        ],
      );
      const cells = hasAggregates
        ? [
            labelCell,
            ...renderColumns(
              table.columns,
              virtual,
              (column, index) => (index === 0 ? null : aggregate(column)),
              "td",
            ),
          ]
        : [labelCell];
      const key = props.itemKey ?? group.key;
      return h(
        "tr",
        {
          role: "row",
          "data-group": group.key,
          "data-group-depth": group.depth,
          "data-aggregate-footer": props.footer ? "" : undefined,
          "aria-level": group.depth + 1,
          "aria-expanded": props.footer ? undefined : String(group.isExpanded),
          "aria-rowindex": layout?.index(key, "group"),
          ...(virtual
            ? {
                "data-virtual-row": "",
                ref: (target: Element | ComponentPublicInstance | null) =>
                  virtual.rows.measureElement(target, key),
              }
            : {}),
        },
        cells,
      );
    };
  },
});

export function groupRow(
  item: Extract<TableRenderItem<unknown>, { kind: "group" }>,
  slots: GroupSlots,
  aggregatePosition: "group" | "footer",
  footer?: TableGroup,
): VNode {
  return h(
    DataTableGroupRow,
    {
      key: item.key,
      itemKey: item.key,
      group: footer ?? item,
      footer: !!footer,
      aggregates: !!footer || aggregatePosition === "group",
      class: "vt-group-row",
    },
    slots,
  );
}
