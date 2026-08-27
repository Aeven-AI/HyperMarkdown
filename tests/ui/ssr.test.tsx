// @vitest-environment jsdom
//
// The rest of the suite renders the engine through renderToStaticMarkup, which
// is server rendering but never exercises the component or hydration: static
// markup carries no hydration data and is never handed back to React. These
// go the whole way — render on the "server", hydrate the same markup on the
// client, and fail on any mismatch React reports.
import React, { createRef } from "react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import HyperMarkdown, { type HyperMarkdownHandle } from "../../index";
import { highlightPlugin } from "../../lib/plugins/code";

beforeAll(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia =
    window.matchMedia ??
    ((() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    })) as any);
  (window as any).requestAnimationFrame =
    (window as any).requestAnimationFrame || ((cb: any) => setTimeout(cb, 0));
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/**
 * Server-render `ui`, hydrate that markup, and return what React complained
 * about. A hydration mismatch arrives as an onRecoverableError, and React also
 * logs it, so both are collected.
 */
function hydrate(ui: React.ReactElement) {
  const html = renderToString(ui);

  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);

  const recoverable: string[] = [];
  const errors: string[] = [];
  const spy = vi
    .spyOn(console, "error")
    .mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });

  // hydrateRoot has to commit inside act, or the effects that attach the
  // imperative handle have not run by the time the test looks at it.
  let root!: ReturnType<typeof hydrateRoot>;
  act(() => {
    root = hydrateRoot(host, ui, {
      onRecoverableError: (error) => {
        recoverable.push(String(error));
      },
    });
  });
  spy.mockRestore();

  return { html, host, root, recoverable, errors };
}

const source = "# Title\n\nSome **bold** text.\n\n```js\nconst a = 1;\n```\n";

describe("server rendering", () => {
  it("renders the component to markup without a DOM", () => {
    const html = renderToString(<HyperMarkdown md={source} />);

    expect(html).toContain("Title");
    expect(html).toContain("const a = 1;");
    expect(html).toContain("<code");
  });

  it("renders an unfinished stream to markup", () => {
    const html = renderToString(
      <HyperMarkdown md={"# Heading\n\nhalf a sen"} />,
    );

    expect(html).toContain("Heading");
    expect(html).toContain("half a sen");
  });

  it("hydrates static content without a mismatch", () => {
    const { recoverable, errors, root } = hydrate(
      <HyperMarkdown md={source} />,
    );

    expect(recoverable).toEqual([]);
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);

    act(() => root.unmount());
  });

  it("hydrates a code block with highlighting without a mismatch", () => {
    const ui = (
      <HyperMarkdown md={source} plugins={{ code: highlightPlugin() }} />
    );
    const { recoverable, errors, root } = hydrate(ui);

    expect(recoverable).toEqual([]);
    expect(errors.filter((e) => /hydrat/i.test(e))).toEqual([]);

    act(() => root.unmount());
  });

  it("adopts the server DOM rather than replacing it", () => {
    // textContent alone proves nothing here: the server markup is already in
    // the host before hydration. Node identity is the real test — hydration
    // reuses the existing elements, a client re-render builds new ones.
    const html = renderToString(<HyperMarkdown md={source} />);
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);

    const serverHeading = host.querySelector("h1");
    const serverCode = host.querySelector("pre code");
    expect(serverHeading).toBeTruthy();

    let root!: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(host, <HyperMarkdown md={source} />);
    });

    expect(host.querySelector("h1")).toBe(serverHeading);
    expect(host.querySelector("pre code")).toBe(serverCode);
    expect(host.textContent).toContain("const a = 1;");

    act(() => root.unmount());
  });

  it("the mismatch check is not vacuous", () => {
    // Hydrating markup that does not match must be reported, or the tests
    // above would pass no matter what the component did.
    const html = renderToString(<HyperMarkdown md={"# Server heading\n"} />);
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);

    const recoverable: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let root!: ReturnType<typeof hydrateRoot>;
    act(() => {
      root = hydrateRoot(host, <HyperMarkdown md={"# Client heading\n"} />, {
        onRecoverableError: (error) => recoverable.push(String(error)),
      });
    });
    spy.mockRestore();

    expect(recoverable.length).toBeGreaterThan(0);

    act(() => root.unmount());
  });

  it("takes a stream after hydrating", () => {
    const ref = createRef<HyperMarkdownHandle>();
    const { host, root } = hydrate(<HyperMarkdown ref={ref} streaming />);

    act(() => {
      ref.current!.write("Hello ");
      ref.current!.write("world\n\n", true);
    });

    expect(host.textContent).toContain("Hello world");

    act(() => root.unmount());
  });
});
