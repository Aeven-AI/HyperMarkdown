import { patterns } from "../patterns";

/**
 * Whether one line is table material.
 *
 * A line carrying an unescaped pipe is a row, whether or not it opens with one:
 * a model writes both `| a | b |` and `a | b`, and a table still arriving has
 * no delimiter row yet, so a run of these lines is what the table path renders
 * as a headless table. Prose is a line with no pipe in it — which is the whole
 * distinction, since GFM itself needs a delimiter row before a run of pipe
 * lines is a table and a shell pipeline or a regex alternation is not one.
 *
 * @param line - one line of the markdown, indentation included.
 * @returns true when the line carries an unescaped pipe.
 */
export function isTableRow(line: string): boolean {
  return patterns.closeRegex.test(line);
}

/**
 * Whether a text is table material: at least one line, every line that carries
 * content a table row.
 *
 * The text is one candidate table — a streaming block's head, or a whole
 * document. Blank lines are not rows and do not disqualify it, because a
 * still-arriving row may be nothing but whitespace and a buffer may carry the
 * blank line that ended the block before it.
 *
 * @param text - the markdown to inspect.
 * @returns true when the text holds at least one row and every content line is
 *   one.
 */
export function isTableText(text: string): boolean {
  let rows = 0;

  for (const line of text.split(patterns.lineSplitRegex)) {
    if (patterns.blankOnlyRegex.test(line)) {
      continue;
    }

    if (!isTableRow(line)) {
      return false;
    }

    rows++;
  }

  return rows > 0;
}
