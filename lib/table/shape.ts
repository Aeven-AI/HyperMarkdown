import React, {
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";

export interface TableShape {
  /** No header cell has content, so the header row is hidden by CSS. */
  headless: boolean;
  /** Widest header seen so far, used for the column-count style hooks. */
  headerColumns: number;
}

interface TableElementProps {
  children?: ReactNode;
}

/**
 * Reads the shape of the rendered table out of its children.
 *
 * A streaming table arrives one row at a time, so both answers wobble before
 * they settle: the header looks empty until its first cell lands, and the
 * column count grows as cells appear. Each is latched once it can no longer
 * change, so the table never re-styles itself mid-stream.
 */
export function readTableShape(
  children: ReactNode,
  shape: TableShape,
  headlessSettled: RefObject<boolean>,
  columnsSettled: RefObject<boolean>,
): void {
  if (headlessSettled.current === true && columnsSettled.current === true) {
    return;
  }

  let headless = true;
  let headerColumns = 0;

  // A header with no rows is a single child, and a one-column header row a
  // single cell. React hands those over unwrapped, so counting by .length
  // silently skips the table and leaves it looking headless.
  const tableChildren = React.Children.toArray(children).filter(isTableElement);

  for (let i = 0, iCount = tableChildren.length; i < iCount; i++) {
    const child = tableChildren[i];

    if (!child) {
      continue;
    }

    if (child.type === "thead") {
      const headRow = React.Children.toArray(child.props.children).find(
        isTableElement,
      );

      const headCells = headRow
        ? React.Children.toArray(headRow.props.children).filter(isTableElement)
        : [];

      for (let j = 0, jCount = headCells.length; j < jCount; j++) {
        const cell = headCells[j];

        if (cell?.type === "th") {
          headerColumns++;

          if (cell.props.children) {
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

  function isTableElement(
    node: ReactNode,
  ): node is ReactElement<TableElementProps> {
    return React.isValidElement<TableElementProps>(node);
  }
}
