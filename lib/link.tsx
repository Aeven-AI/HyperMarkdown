import React, { memo } from "react";

import * as runtime from "./platform/runtime";

interface AnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  renderer?: unknown;
  scrollDown?: unknown;
  "data-footnote-ref"?: string;
  "data-footnote-backref"?: string;
}

interface FootnoteChildProps {
  children?: React.ReactNode;
}

/**
 * Anchors rendered from markdown. Ordinary links open in a new tab; footnote
 * references and back-references stay in the page and jump by hash.
 */
function MarkdownLink(props: AnchorProps) {
  const { renderer: _renderer, scrollDown: _scrollDown, ...rest } = props;
  const comProps: React.AnchorHTMLAttributes<HTMLAnchorElement> = { ...rest };

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
function footnoteLabel(
  id: string | undefined,
  children: React.ReactNode
): React.ReactNode {
  let current;
  let first;

  if (typeof id !== "string") {
    return children;
  }

  const value = id.replace("user-content-fnref-", "");

  if (!React.isValidElement<FootnoteChildProps>(children)) {
    if (Array.isArray(children)) {
      first = children[0];

      if (React.isValidElement<FootnoteChildProps>(first) && first.type === "span") {
        current = first.props.children;

        if (String(value) !== String(current)) {
          return [React.cloneElement(first, undefined, value), ...children.slice(1)];
        }
      }
    }

    return String(value) === String(children) ? children : value;
  }

  if (children.type === "span") {
    current = children.props.children;
    return String(value) === String(current)
      ? children
      : React.cloneElement(children, undefined, value);
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
