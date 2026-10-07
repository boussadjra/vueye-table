import { issue, type TableIssue } from "./issues";
import type { RowKey } from "./state";

export type ValidationResult = true | string | { readonly message: string; readonly code?: string };
export type Validator<TValue, TRow> = (
  value: TValue,
  row: TRow,
) => ValidationResult | Promise<ValidationResult>;
export interface EditorSpec {
  readonly kind: "text" | "number" | "select" | "checkbox" | "date";
  readonly options?: readonly (string | number | boolean | null)[] | undefined;
  readonly min?: number | undefined;
  readonly max?: number | undefined;
  readonly maxLength?: number | undefined;
  readonly pattern?: string | undefined;
}
export interface PendingCell {
  readonly rowKey: RowKey;
  readonly column: string;
  readonly value: unknown;
}

export function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return typeof value === "object" && value !== null && "then" in value;
}

/** Validators receive values; their messages remain plain text. */
export function runValidation(
  validate: () => ValidationResult | Promise<ValidationResult>,
  rowKey: RowKey,
  column?: string,
): TableIssue | undefined | Promise<TableIssue | undefined> {
  const fail = (message: string, validationCode?: string): TableIssue =>
    issue("validation_failed", message, { rowKey, column, validationCode });
  const read = (result: ValidationResult): TableIssue | undefined => {
    if (result === true) return undefined;
    if (typeof result === "string") return fail(result);
    if (result && typeof result.message === "string") return fail(result.message, result.code);
    return fail("The validator returned an invalid result.");
  };
  const thrown = (error: unknown): TableIssue =>
    fail(error instanceof Error ? error.message : String(error));
  try {
    const result = validate();
    return isPromise(result) ? Promise.resolve(result).then(read, thrown) : read(result);
  } catch (error) {
    return thrown(error);
  }
}

export function editorFailure(spec: EditorSpec | undefined, value: unknown): string | undefined {
  if (!spec) return undefined;
  if (spec.maxLength !== undefined && (!Number.isSafeInteger(spec.maxLength) || spec.maxLength < 0))
    return "Editor maxLength must be a non-negative safe integer.";
  if (
    (spec.min !== undefined && !Number.isFinite(spec.min)) ||
    (spec.max !== undefined && !Number.isFinite(spec.max)) ||
    (spec.min !== undefined && spec.max !== undefined && spec.min > spec.max)
  )
    return "Editor bounds must be finite and ordered.";
  if (spec.options && !spec.options.some((option) => Object.is(option, value)))
    return "Choose one of the allowed values.";
  if (spec.maxLength !== undefined && typeof value === "string" && value.length > spec.maxLength)
    return `Use at most ${spec.maxLength} characters.`;
  if (spec.min !== undefined || spec.max !== undefined) {
    const number = value instanceof Date ? value.getTime() : value;
    if (typeof number !== "number" || !Number.isFinite(number))
      return "Enter a finite numeric value.";
    if (spec.min !== undefined && number < spec.min) return `Use a value of at least ${spec.min}.`;
    if (spec.max !== undefined && number > spec.max) return `Use a value of at most ${spec.max}.`;
  }
  if (spec.pattern !== undefined) {
    try {
      if (typeof value !== "string" || !new RegExp(spec.pattern, "u").test(value))
        return "The value does not match the required pattern.";
    } catch {
      return "The editor pattern is invalid.";
    }
  }
  return undefined;
}
