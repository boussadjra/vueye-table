/** A piece of compact JSON, classified for syntax coloring. */
export interface JsonToken {
  readonly text: string;
  readonly kind: "key" | "string" | "number" | "literal" | "punctuation";
}

const pattern =
  /("(?:\\.|[^"\\])*")(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],])/gu;

/** Split the output of `JSON.stringify` into tokens, with a space after colons and commas. */
export function tokenize(json: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  for (const [, string, colon, number, literal, punctuation] of json.matchAll(pattern)) {
    if (string !== undefined) {
      tokens.push({ text: string, kind: colon ? "key" : "string" });
      if (colon) {
        tokens.push({ text: ": ", kind: "punctuation" });
      }
    } else if (number !== undefined) {
      tokens.push({ text: number, kind: "number" });
    } else if (literal !== undefined) {
      tokens.push({ text: literal, kind: "literal" });
    } else if (punctuation !== undefined) {
      tokens.push({ text: punctuation === "," ? ", " : punctuation, kind: "punctuation" });
    }
  }
  return tokens;
}
