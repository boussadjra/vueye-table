/**
 * Turn a column id into a readable header: `"name.first_name"` becomes `"Name first name"` and
 * `"createdAt"` becomes `"Created at"`.
 */
export function humanize(id: string): string {
  const words = id
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .split(/[\s._-]+/u)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
  const sentence = words.join(" ");
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}
