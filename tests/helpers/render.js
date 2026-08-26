import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";

import Renderer from "../../lib/renderer";

export function renderStatic(markdown, options = {}) {
  const renderer = new Renderer({
    md: markdown,
    streaming: false,
    animation: false,
    ...options,
  });

  return renderToStaticMarkup(renderer.render());
}

export function renderStreamed(markdown, chunkSize = 1, options = {}) {
  let index;
  const renderer = new Renderer({
    streaming: true,
    animation: false,
    ...options,
  });

  for (index = 0; index < markdown.length; index += chunkSize) {
    renderer.streamMd(
      markdown.slice(index, index + chunkSize),
      true,
      false,
      false,
    );
  }

  renderer.streamMd("", true, false, true);

  return renderToStaticMarkup(renderer.render());
}

export function renderPending(markdown, options = {}) {
  const renderer = new Renderer({
    streaming: true,
    animation: false,
    ...options,
  });

  renderer.streamMd(markdown, true, false, false);

  return renderToStaticMarkup(renderer.render());
}

export function parseMarkup(markup) {
  return new JSDOM(`<body>${markup}</body>`, {
    url: "https://hypermarkdown.test/",
  }).window.document;
}

export function visibleText(markup) {
  const document = parseMarkup(markup);

  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function compactText(markup) {
  return visibleText(markup).replace(/\s+/g, "");
}
