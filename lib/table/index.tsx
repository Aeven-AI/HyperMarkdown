import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

import * as runtime from "../platform/runtime";
import Tooltip, { type TooltipHandle } from "../tooltip";

const ICON_MAXIMIZE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="maximize2-icon maximize-2"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></svg>';

const ICON_MINIMIZE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="minimize2-icon minimize-2"><path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/></svg>';

const ICON_COPY =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

/** Distance from the sticky chat header at which the toolbar goes flat. */
const HEADER_OFFSET = 56;

/** Below this the table is nearly scrolled past, so the toolbar drops away. */
const HEADER_MIN_VISIBLE = 106;

interface TableHeaderProps {
  /** True while the table is still being streamed in. */
  stream?: boolean;
  tableRef: RefObject<HTMLTableElement | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  /** Tells the wrapper the header toggled fullscreen. */
  onToggleFullScreen?: (fullscreen: boolean) => void;
}

/**
 * The toolbar pinned above a table: fullscreen and copy, plus the "scroll"
 * class that flattens it once the table starts leaving the viewport.
 */
function TableHeaderComponent(props: TableHeaderProps) {
  const { stream, tableRef, wrapperRef, onToggleFullScreen } = props;

  const [fullscreen, setFullscreen] = useState(false);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const tippyCopyRef = useRef<TooltipHandle | null>(null);

  // The scroll handler is registered once but reads the current fullscreen
  // value, so it goes through a ref rather than the closed-over state.
  const fullscreenRef = useRef(fullscreen);
  fullscreenRef.current = fullscreen;

  const tickingRef = useRef(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const updateHeaderScrollClass = useCallback(() => {
    if (tickingRef.current === true) {
      return;
    }

    tickingRef.current = true;

    requestAnimationFrame(() => {
      const header = headerRef.current;
      const wrapper = wrapperRef.current;

      tickingRef.current = false;

      if (!header) {
        return;
      }

      if (fullscreenRef.current === true || !wrapper) {
        header.classList.remove("scroll");
        return;
      }

      const rect = wrapper.getBoundingClientRect();
      const top = rect?.top || 0;
      const height = rect?.height || 0;

      if (top < HEADER_OFFSET && height + top > HEADER_MIN_VISIBLE) {
        header.classList.add("scroll");
      } else {
        header.classList.remove("scroll");
      }
    });
  }, [wrapperRef]);

  useEffect(() => {
    updateHeaderScrollClass();
    return runtime.onViewportScroll(updateHeaderScrollClass);
  }, [updateHeaderScrollClass]);

  useEffect(() => {
    return () => {
      clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copyContent = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const table = tableRef.current;

    if (!table) {
      return;
    }

    // innerText, not textContent: it keeps the row and cell breaks the browser
    // lays out, which is what makes the copy paste back as a table.
    navigator.clipboard
      .writeText(table.innerText)
      .then(() => {
        tippyCopyRef.current?.show();

        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = setTimeout(() => {
          tippyCopyRef.current?.hide();
        }, 600);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [tableRef]);

  const toggleFullScreen = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      setFullscreen((current) => {
        const next = current !== true;

        if (onToggleFullScreen) {
          onToggleFullScreen(next);
          runtime.emitter.dispatchObjectEvent("fullscreen:change", next);
        }

        return next;
      });
    },
    [onToggleFullScreen]
  );

  const copyLabel =
    stream === true ? "Table partially copied" : "Table copied";

  return (
    <div ref={headerRef} className="table-header">
      <div className="table-header-content">
        <span className="table-title-container">
          <span className="table-title">Table</span>
        </span>
        <span className="table-spacer" />
        <span className="table-button-container">
          <Tooltip
            placement={"top"}
            touch={false}
            trigger={"mouseenter"}
            content={"Full screen"}
          >
            <button
              className="table-icon-button first"
              onClick={toggleFullScreen}
            >
              <span className="button-content">
                <span
                  className="button-icon"
                  dangerouslySetInnerHTML={{
                    __html: fullscreen === true ? ICON_MINIMIZE : ICON_MAXIMIZE,
                  }}
                ></span>
              </span>
            </button>
          </Tooltip>
          <Tooltip
            ref={tippyCopyRef}
            arrow={false}
            trigger={"manual"}
            placement={"top-end"}
            content={copyLabel}
          >
            <span className="tippy-button">
              <Tooltip
                placement={"top-end"}
                content={"Copy"}
                touch={false}
                trigger={"mouseenter"}
              >
                <button
                  className="table-icon-button last"
                  onClick={copyContent}
                >
                  <span className="button-content">
                    <span
                      className="button-icon"
                      dangerouslySetInnerHTML={{ __html: ICON_COPY }}
                    ></span>
                  </span>
                </button>
              </Tooltip>
            </span>
          </Tooltip>
        </span>
      </div>
      <div className="table-header-background">
        <div className="table-header-fade" />
        <div className="table-header-blur" />
      </div>
    </div>
  );
}

const TableHeader = memo(
  TableHeaderComponent,
  (prev, next) => prev.stream === next.stream && prev.tableRef === next.tableRef
);

TableHeader.displayName = "TableHeader";

interface TableShape {
  /** No header cell has content, so the header row is hidden by CSS. */
  headless: boolean;
  /** Widest header seen so far, used for the column-count style hooks. */
  headerColumns: number;
}

/**
 * Reads the shape of the rendered table out of its children.
 *
 * A streaming table arrives one row at a time, so both answers wobble before
 * they settle: the header looks empty until its first cell lands, and the
 * column count grows as cells appear. Each is latched once it can no longer
 * change, so the table never re-styles itself mid-stream.
 */
function readTableShape(
  children: ReactNode,
  shape: TableShape,
  headlessSettled: RefObject<boolean>,
  columnsSettled: RefObject<boolean>
): void {
  if (headlessSettled.current === true && columnsSettled.current === true) {
    return;
  }

  let headless = true;
  let headerColumns = 0;

  // A header with no rows is a single child, and a one-column header row a
  // single cell. React hands those over unwrapped, so counting by .length
  // silently skips the table and leaves it looking headless.
  const tableChildren = React.Children.toArray(children) as ReactElement<any>[];

  for (let i = 0, iCount = tableChildren.length; i < iCount; i++) {
    const child = tableChildren[i];

    if (child.type === "thead") {
      const headRow = React.Children.toArray(
        child.props.children
      )[0] as ReactElement<any> | undefined;

      const headCells = headRow
        ? (React.Children.toArray(headRow.props.children) as ReactElement<any>[])
        : [];

      for (let j = 0, jCount = headCells.length; j < jCount; j++) {
        if (headCells[j].type === "th") {
          headerColumns++;

          if (headCells[j]?.props?.children) {
            headless = false;
          }
        }
      }
    }

    if (child.type === "tbody") {
      const bodyRows = React.Children.toArray(child.props.children);

      // Past a couple of body rows the header can no longer turn up.
      if (bodyRows.length > 2) {
        headlessSettled.current = true;
      }
    }
  }

  shape.headless = headless;

  if (columnsSettled.current !== true) {
    if (headerColumns >= shape.headerColumns) {
      shape.headerColumns = headerColumns;
    } else {
      columnsSettled.current = true;
    }
  }
}

export interface MarkdownTableProps
  extends React.TableHTMLAttributes<HTMLTableElement> {
  /** True while rows are still arriving. */
  stream?: boolean;
  /** Passed in by the renderer; not a DOM attribute. */
  renderer?: unknown;
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
  const { renderer: _renderer, scrollDown: _scrollDown, stream, ...tableProps } =
    props;

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
    columnsSettled
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
      userScroll.current = scrollTop + clientHeight <= scrollHeight - SCROLL_MARGIN;
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

  const wrapperClass =
    "table-wrapper" +
    (stream === true ? " stream-active" : "") +
    (fullscreen === true ? " fullscreen" : "");

  return (
    <div ref={wrapperRef} className={wrapperClass}>
      <div className="table-container">
        <TableHeader
          stream={stream}
          tableRef={tableRef}
          wrapperRef={wrapperRef}
          onToggleFullScreen={onToggleFullScreen}
        />
        <div className="table-content">
          <div className="table-scroll no-scrollbar">
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
