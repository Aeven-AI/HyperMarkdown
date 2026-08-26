import { hypermarkdown } from "./hypermarkdown.js";
import { streamdown } from "./streamdown.js";
import { markstream } from "./markstream.js";
import { deepseek } from "./deepseek.js";
import { reactMarkdown } from "./react-markdown.js";
import { markdownIt } from "./markdown-it.js";

export const RENDERERS = [
  hypermarkdown,
  streamdown,
  markstream,
  deepseek,
  reactMarkdown,
  markdownIt,
];

export const byName = new Map(RENDERERS.map((r) => [r.name, r]));
