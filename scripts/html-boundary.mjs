/** Package renderers accept text and VNodes; raw HTML belongs to application-owned slots. */
export function hasUnsafeHtml(source) {
  return /\bv-html\b|\binnerHTML\b/iu.test(source);
}
