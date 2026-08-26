import { createElement } from "react";
import MarkdownRender from "markstream-react";

/**
 * markstream-react takes the accumulated text plus a `final` flag, and does
 * its own incremental work behind that interface. Fade is off so the
 * measurement is parse and reconcile, not animation.
 */
export const markstream = {
  name: "markstream-react",
  strategy: "streaming parser + per-node components",

  create() {
    let text = "";
    let done = false;

    return {
      write: (chunk) => {
        text += chunk;
      },
      finish: () => {
        done = true;
      },
      element: () =>
        createElement(MarkdownRender, {
          content: text,
          final: done,
          fade: false,
        }),
    };
  },
};
