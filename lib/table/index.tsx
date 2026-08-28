import React, { memo, useCallback, useEffect, useRef, useState } from "react";

import type { Emitter } from "../runtime";
import { cssLength, defaultUi } from "../config";
import type { UiConfig } from "../config";

import TableHeader from "./header";
import { readTableShape, type TableShape } from "./shape";

export interface MarkdownTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** True while rows are still arriving. */
  stream?: boolean | undefined;
  /** Passed in by the renderer; not a DOM attribute. */
  renderer?: unknown;
  events?: Emitter | undefined;
  ui?: UiConfig | undefined;
  /** Passed in by the renderer; not a DOM attribute. */
  scrollDown?: unknown;
}

/** How close to the bottom still counts as "following" the stream. */
const SCROLL_MARGIN = 100;

/**
 * A table with its own toolbar, horizontal scroll container and fullscreen
 * mode. In fullscreen it follows the stream downward until the reader scrolls
 * away, the same way the chat transcript does.
 */
function MarkdownTableComponent(props: MarkdownTableProps) {
  const {
    renderer: _renderer,
    events,
    ui,
    scrollDown: _scrollDown,
    stream,
    ...tableProps
  } = props;

  const [fullscreen, setFullscreen] = useState(false);

  const tableRef = useRef<HTMLTableElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const shapeRef = useRef<TableShape>({ headless: true, headerColumns: 0 });
  const headlessSettled = useRef(false);
  const columnsSettled = useRef(false);

  const userScroll = useRef(false);
  const lastScrollHeight = useRef(0);

  readTableShape(
    props.children,
    shapeRef.current,
    headlessSettled,
    columnsSettled,
  );

  // Fullscreen tables follow the stream, so the listener only exists while
  // fullscreen is on; outside it the wrapper scrolls horizontally only.
  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (fullscreen !== true || !wrapper) {
      return;
    }

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = wrapper;
      userScroll.current =
        scrollTop + clientHeight <= scrollHeight - SCROLL_MARGIN;
    };

    wrapper.addEventListener("scroll", onScroll);

    return () => {
      wrapper.removeEventListener("scroll", onScroll);
    };
  }, [fullscreen]);

  // No dependency list: every render can have added a row, and the table only
  // follows along while the reader has not scrolled away from the bottom.
  useEffect(() => {
    const wrapper = wrapperRef.current;

    if (fullscreen !== true || !wrapper || userScroll.current === true) {
      return;
    }

    if (lastScrollHeight.current !== wrapper.scrollHeight) {
      wrapper.scrollTo({ top: wrapper.scrollHeight, behavior: "instant" });
      lastScrollHeight.current = wrapper.scrollHeight;
    }
  });

  const onToggleFullScreen = useCallback((next: boolean) => {
    setFullscreen(next);
  }, []);

  const config = ui ?? defaultUi;
  const maxHeight = cssLength(config.tableMaxHeight);

  const wrapperClass =
    "table-wrapper" +
    (stream === true ? " stream-active" : "") +
    (fullscreen === true ? " fullscreen" : "");
  const scrollClass =
    "table-scroll no-scrollbar" +
    (shapeRef.current.headerColumns >= 4 ? " md-table-wide" : "");

  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      style={
        maxHeight === undefined || fullscreen === true
          ? undefined
          : { maxHeight }
      }
    >
      <div className="table-container">
        <TableHeader
          events={events}
          ui={ui}
          stream={stream}
          tableRef={tableRef}
          wrapperRef={wrapperRef}
          fullscreen={fullscreen}
          onToggleFullScreen={onToggleFullScreen}
        />
        <div className="table-content">
          <div className={scrollClass}>
            <table
              {...tableProps}
              ref={tableRef}
              data-headless={shapeRef.current.headless}
              data-header-columns={shapeRef.current.headerColumns}
            >
              {props.children}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const MarkdownTable = memo(MarkdownTableComponent);

MarkdownTable.displayName = "MarkdownTable";

export default MarkdownTable;
