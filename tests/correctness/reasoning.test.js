import { describe, expect, it } from "vitest";

import {
  parseMarkup,
  renderPending,
  renderStatic,
  renderStreamed,
  visibleText,
} from "../helpers/render";

const source =
  "<think>\nLet me reason.\n\n- one\n- two\n</think>\n\nThe answer is 42.\n\n";

describe("reasoning blocks", () => {
  it.each([
    ["streamed", () => renderStreamed(source, 4)],
    ["whole document", () => renderStatic(source)],
  ])("separates reasoning from the answer (%s)", (_name, render) => {
    const document = parseMarkup(render());
    const reasoning = document.querySelector(".reasoning-wrapper");

    expect(reasoning).not.toBe(null);
    expect(reasoning?.textContent).toContain("Let me reason.");
    expect(reasoning?.textContent).not.toContain("The answer is 42.");
  });

  it.each([
    ["streamed", () => renderStreamed(source, 4)],
    ["whole document", () => renderStatic(source)],
  ])("renders the markdown inside it (%s)", (_name, render) => {
    const document = parseMarkup(render());

    expect(document.querySelectorAll(".reasoning-content li")).toHaveLength(2);
  });

  it("leaves the answer outside the block", () => {
    const document = parseMarkup(renderStreamed(source, 4));
    const answer = [...document.querySelectorAll("p")].find(
      (node) => node.closest(".reasoning-wrapper") === null,
    );

    expect(answer?.textContent).toBe("The answer is 42.");
  });

  it.each(["<", "<t", "<thi", "<think", "<thinking", "<reason"])(
    "shows nothing for the half-arrived tag %j",
    (partial) => {
      expect(visibleText(renderPending(partial))).toBe("");
    },
  );

  it("keeps prose that precedes a half-arrived tag", () => {
    expect(visibleText(renderPending("hello <thi"))).toBe("hello");
  });

  it("opens the block as soon as the tag completes", () => {
    expect(visibleText(renderPending("<think>"))).toContain("Thinking");
  });

  it("streams the reasoning into the block as it arrives", () => {
    const markup = renderPending("<think>\nLet me rea");

    expect(parseMarkup(markup).querySelector(".reasoning-wrapper")).not.toBe(
      null,
    );
    expect(visibleText(markup)).toContain("Let me rea");
  });

  it.each(["think", "thinking", "reasoning"])("recognises <%s>", (tag) => {
    const markup = renderStreamed(`<${tag}>why</${tag}>\n\nanswer\n\n`, 3);

    expect(parseMarkup(markup).querySelector(".reasoning-wrapper")).not.toBe(
      null,
    );
  });

  it("treats a document that is only reasoning as reasoning", () => {
    const document = parseMarkup(renderStreamed("<think>only this</think>", 3));

    expect(document.querySelector(".reasoning-wrapper")?.textContent).toContain(
      "only this",
    );
  });

  it("leaves an ordinary HTML block alone", () => {
    const markup = renderStreamed("<div>plain</div>\n\n", 3);

    expect(parseMarkup(markup).querySelector(".reasoning-wrapper")).toBe(null);
  });
});

describe("reasoningTarget", () => {
  it("renders in place when no target is given", () => {
    const document = parseMarkup(renderStreamed(source, 4));
    const reasoning = document.querySelector(".reasoning-wrapper");

    expect(reasoning?.closest(".hypermarkdown")).not.toBe(null);
  });

  it("renders in place when the target resolves to null", () => {
    const markup = renderStreamed(source, 4, { reasoningTarget: () => null });

    expect(parseMarkup(markup).querySelector(".reasoning-wrapper")).not.toBe(
      null,
    );
  });
});
