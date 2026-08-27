import { createElement } from "react";
import { Streamdown } from "streamdown";

/**
 * Streamdown splits the accumulated text into top-level blocks and memoizes
 * each one, so settled blocks are not re-rendered. Plugins are omitted, which
 * is also what turns off maths and highlighting — the same footing as the
 * others here.
 */
export const streamdown = {
  name: "streamdown",
  strategy: "block-level memoization",

  create() {
    let text = "";

    return {
      write: (chunk) => {
        text += chunk;
      },
      finish: () => {},
      element: () =>
        createElement(Streamdown, {
          mode: "streaming",
          parseIncompleteMarkdown: true,
          children: text,
        }),
    };
  },
};
