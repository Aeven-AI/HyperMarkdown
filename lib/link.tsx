import React, { memo } from "react";

import * as runtime from "./platform/runtime";

interface AnchorProps {
  href?: string;
  id?: string;
  children?: React.ReactNode;
  "data-footnote-ref"?: string;
  "data-footnote-backref"?: string;
  [key: string]: unknown;
}

/**
 * Anchors rendered from markdown. Ordinary links open in a new tab; footnote
 * references and back-references stay in the page and jump by hash.
 */
function MarkdownLink(props: AnchorProps) {
  const { renderer: _renderer, scrollDown: _scrollDown, ...rest } = props;
  const comProps: Record<string, any> = { ...rest };

  const footnoteRef = props["data-footnote-ref"];
  const footnoteBackref = props["data-footnote-backref"];

  if (footnoteRef !== "" && footnoteBackref !== "") {
    return (
      <a target="_blank" rel="noreferrer" {...comProps}>
        {comProps.children}
      </a>
    );
  }

  let children = comProps.children;

  comProps.href = runtime.currentPath() + "/" + comProps.href;

  if (footnoteRef === "") {
    children = footnoteLabel(comProps.id, children);
  }

  return (
    <a
      {...comProps}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.location.hash = props.href ?? "";
      }}
    >
      {children}
    </a>
  );
}

/**
 * A footnote reference shows its number. Streaming can leave the wrong text in
 * place, so it is replaced with the number carried by the element id.
 */
function footnoteLabel(id: unknown, children: any) {
  if (typeof id !== "string") {
    return children;
  }

  const value = id.replace("user-content-fnref-", "");

  if (!children || !children.type) {
    return String(value) === String(children) ? children : value;
  }

  if (children.type === "span") {
    const current = children.props && children.props.children;
    return String(value) === String(current)
      ? children
      : React.cloneElement(children, children.props, value);
  }

  if (Array.isArray(children)) {
    const first = children[0];

    if (first && first.type === "span") {
      const current = first.props && first.props.children;

      if (String(value) !== String(current)) {
        return [
          React.cloneElement(first, first.props, value),
          ...children.slice(1),
        ];
      }
    }
  }

  return children;
}

// Re-renders only when the destination changes, as the class did.
const MemoMarkdownLink = memo(
  MarkdownLink,
  (prev, next) => prev.href === next.href
);

MemoMarkdownLink.displayName = "MarkdownLink";

export default MemoMarkdownLink;
