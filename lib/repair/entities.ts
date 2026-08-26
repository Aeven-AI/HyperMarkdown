import { patterns } from "../patterns";

export function fixPartialEntity(text: string, pending: boolean): string {
  if (!text || text === "" || pending !== true) {
    return text;
  }

  return text.replace(patterns.partialEntityRegex, "");
}
