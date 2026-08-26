import { patterns } from "../patterns";

/**
 * Collect the footnote definitions a chunk carries.
 *
 * Definitions can arrive long after the reference that needs them, and can be
 * repeated as the stream goes on, so they are accumulated in `footnotes` (which
 * this mutates) rather than read out of the current buffer alone.
 *
 * Returns the block of references and definitions to append to a block being
 * rendered, or null when nothing has been collected yet.
 */
export function collectReferences(
  mdBuffer: string,
  footnotes: Map<string, string>,
): string | null {
  const references = mdBuffer.match(patterns.footnoteRegex);

  if (!references) {
    return null;
  }

  const definitions = mdBuffer.match(patterns.footnoteDefRegex);

  if (definitions) {
    references.forEach((reference) => {
      definitions.forEach((definition) => {
        if (definition.trim().startsWith(reference)) {
          footnotes.set(reference, definition);
        }
      });
    });
  }

  if (footnotes.size === 0) {
    return null;
  }

  const referenceString = Array.from(footnotes.keys()).join(" ");
  const definitionString = Array.from(footnotes.values()).join("\n");

  return referenceString + "\n\n" + definitionString;
}
