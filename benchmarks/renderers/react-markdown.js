import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const plugins = [remarkGfm];

/**
 * The baseline everyone starts from: hand it the whole accumulated string
 * every chunk and let it re-parse. No streaming support of any kind.
 */
export const reactMarkdown = {
  name: "react-markdown",
  strategy: "none — full reparse per chunk",

  create() {
    let text = "";

    return {
      write: (chunk) => {
        text += chunk;
      },
      finish: () => {},
      element: () =>
        createElement(ReactMarkdown, { remarkPlugins: plugins }, text),
    };
  },
};
