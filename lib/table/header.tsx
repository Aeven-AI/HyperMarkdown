import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from "react";

import * as runtime from "../runtime";
import type { Emitter } from "../runtime";
import { defaultUi } from "../config";
import type { UiConfig } from "../config";
import Tooltip, { type TooltipHandle } from "../tooltip";

/** Distance from the sticky chat header at which the toolbar goes flat. */
const HEADER_OFFSET = 56;

/** Below this the table is nearly scrolled past, so the toolbar drops away. */
const HEADER_MIN_VISIBLE = 106;

interface TableHeaderProps {
  /** This renderer's own bus, so blocks report only to the renderer that made them. */
  events?: Emitter | undefined;
  ui?: UiConfig | undefined;
  /** True while the table is still being streamed in. */
  stream?: boolean | undefined;
  tableRef: RefObject<HTMLTableElement | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  fullscreen: boolean;
  /** Tells the wrapper the header toggled fullscreen. */
  onToggleFullScreen?: (fullscreen: boolean) => void;
}

/**
 * The toolbar pinned above a table: fullscreen and copy, plus the "scroll"
 * class that flattens it once the table starts leaving the viewport.
 */
function TableHeaderComponent(props: TableHeaderProps) {
  const { stream, tableRef, wrapperRef, fullscreen, onToggleFullScreen } =
    props;

  const headerRef = useRef<HTMLDivElement | null>(null);
  const tippyCopyRef = useRef<TooltipHandle | null>(null);

  // The scroll handler is registered once but reads the current fullscreen
  // value, so it goes through a ref rather than the closed-over state.
  const tickingRef = useRef(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
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

      if (fullscreen === true || !wrapper) {
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
  }, [fullscreen, wrapperRef]);

  useEffect(() => {
    updateHeaderScrollClass();
    return runtime.onViewportScroll(updateHeaderScrollClass);
  }, [updateHeaderScrollClass]);

  useEffect(() => {
    return () => {
      clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copyContent = useCallback(
    (event: React.MouseEvent) => {
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
    },
    [tableRef],
  );

  const toggleFullScreen = useCallback(
    (event: React.MouseEvent) => {
      let next;

      event.preventDefault();
      event.stopPropagation();

      next = fullscreen !== true;

      onToggleFullScreen?.(next);
      props.events?.dispatchObjectEvent("fullscreen:change", next);
    },
    [fullscreen, onToggleFullScreen],
  );

  const ui = props.ui ?? defaultUi;
  const { translations, icons } = ui;
  const controls = ui.controls.table;

  const copyLabel =
    stream === true
      ? translations.tablePartiallyCopied
      : translations.tableCopied;

  return (
    <div ref={headerRef} className="table-header">
      <div className="table-header-content">
        <span className="table-title-container">
          <span className="table-title">{translations.table}</span>
        </span>
        <span className="table-spacer" />
        <span className="table-button-container">
          {controls.fullscreen === false ? null : (
            <Tooltip
              placement={"top"}
              touch={false}
              trigger={"mouseenter"}
              content={translations.fullScreen}
            >
              <button
                type="button"
                className="table-icon-button first"
                aria-label={translations.fullScreen}
                onClick={toggleFullScreen}
              >
                <span className="button-content">
                  <span
                    className="button-icon"
                    dangerouslySetInnerHTML={{
                      __html:
                        fullscreen === true ? icons.minimize : icons.maximize,
                    }}
                  ></span>
                </span>
              </button>
            </Tooltip>
          )}
          {controls.copy === false ? null : (
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
                  content={translations.copy}
                  touch={false}
                  trigger={"mouseenter"}
                >
                  <button
                    type="button"
                    className="table-icon-button last"
                    aria-label={translations.copy}
                    onClick={copyContent}
                  >
                    <span className="button-content">
                      <span
                        className="button-icon"
                        dangerouslySetInnerHTML={{ __html: icons.copy }}
                      ></span>
                    </span>
                  </button>
                </Tooltip>
              </span>
            </Tooltip>
          )}
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
  (prev, next) =>
    prev.stream === next.stream &&
    prev.fullscreen === next.fullscreen &&
    prev.tableRef === next.tableRef &&
    prev.wrapperRef === next.wrapperRef &&
    prev.onToggleFullScreen === next.onToggleFullScreen,
);

TableHeader.displayName = "TableHeader";

export default TableHeader;
