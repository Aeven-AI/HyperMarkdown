import { patterns } from "../patterns";

export function definitionsOnly(md: string): boolean {
  let i;
  let line;
  let lines;
  let sawDefinition;

  lines = md.split(patterns.lineSplitRegex);
  sawDefinition = false;

  for (i = 0; i < lines.length; i++) {
    line = lines[i] ?? "";

    if (line.trim() === "") {
      continue;
    }

    if (patterns.footnoteDefinitionRegex.test(line) === true) {
      sawDefinition = true;
      continue;
    }

    if (
      sawDefinition === true &&
      patterns.footnoteContinuationRegex.test(line)
    ) {
      continue;
    }

    return false;
  }

  return sawDefinition;
}
