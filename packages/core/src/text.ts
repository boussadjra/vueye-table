/**
 * Text as a search reads it: no case, no accents, no Arabic vowel marks, and one shape per
 * letter, so `benali` finds `Bénali` and `احمد` finds `أحمد`. Compatibility decomposition splits
 * a letter from its marks (`é` → `e` + U+0301, `أ` → `ا` + U+0654), the marks are dropped, and the
 * Arabic letters that keep a shape of their own after that are read as the letter they stand for.
 */
const LETTER_SHAPES: Readonly<Record<string, string>> = {
  ٱ: "ا", // alef wasla → alef
  ى: "ي", // alef maqsura → yeh
  ة: "ه", // teh marbuta → heh
  ـ: "", // tatweel stretches a word and is not a letter
};
const SHAPES = /[ٱىةـ]/gu;
const MARKS = /\p{M}/gu;

/** The default text normalization of search and text filters. */
export function foldText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(MARKS, "")
    .replace(SHAPES, (letter) => LETTER_SHAPES[letter] ?? letter)
    .toLowerCase();
}

/** A text normalization: what search and text filters compare after reading both sides. */
export type TextNormalizer = (text: string) => string;

/** The collator a table orders text with: natural numbers, case and accents ignored. */
export function createCollator(locale?: string): Intl.Collator {
  return new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
}
