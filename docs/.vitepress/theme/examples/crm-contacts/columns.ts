import { defineColumns } from "vueye-table";

import { formatMoney, ownerName, relativeDay, stageLabel, type Contact } from "./data";

const STAGE_ORDER = ["lead", "qualified", "proposal", "customer", "churned"];

export const contactColumns = defineColumns<Contact>([
  { id: "name", header: "Name", minWidth: 200 },
  { id: "company", header: "Company", minWidth: 150 },
  { id: "role", header: "Role", hidden: true },
  { id: "email", header: "Email", sortable: false, hidden: true },
  { id: "phone", header: "Phone", sortable: false, hidden: true },
  {
    id: "owner",
    header: "Owner",
    // Search matches the owner's name, not the id; the default filter still compares ids.
    format: (owner) => ownerName(owner),
    compare: (left, right) => ownerName(left).localeCompare(ownerName(right), "en"),
  },
  {
    id: "stage",
    header: "Stage",
    format: (stage) => stageLabel(stage),
    compare: (left, right) => STAGE_ORDER.indexOf(left) - STAGE_ORDER.indexOf(right),
  },
  {
    id: "tags",
    header: "Tags",
    sortable: false,
    // Keep a contact only when it carries every selected tag.
    filter: (tags, selected) =>
      !Array.isArray(selected) || selected.every((tag: string) => tags.includes(tag)),
  },
  {
    id: "lastContacted",
    header: "Last contacted",
    searchable: false,
    format: (day) => relativeDay(day),
    // ISO days order correctly as plain text.
    compare: (left, right) => (left < right ? -1 : left > right ? 1 : 0),
  },
  {
    id: "dealValue",
    header: "Deal value",
    align: "end",
    searchable: false,
    format: (value) => formatMoney(value),
  },
  { id: "favorite", header: "Favorite", searchable: false, hidden: true },
]);
