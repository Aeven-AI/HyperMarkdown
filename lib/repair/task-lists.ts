import { patterns } from "../patterns";

export function fixTasklist(text: string): string {
  const invalidTaskRegex = patterns.invalidTaskRegex;

  return text.replace(invalidTaskRegex, "$1$2");
}
