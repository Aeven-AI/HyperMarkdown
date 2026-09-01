/**
 * Whether a diagram source has enough in it to be drawn yet.
 *
 * A fence renders on every delta while it streams, so the engine sees the
 * diagram grow one keystroke at a time. Nearly every type copes: it draws what
 * it has so far, or it throws and the render path catches that and keeps the
 * frame it already had.
 *
 * The data-driven types do neither. Given a row that is still being typed they
 * lay out *successfully* against a range that is empty or backwards — a gantt
 * writes NaN coordinates and negative bar widths, a pie an infinite viewBox —
 * which the browser then reports for every keystroke of the fence. There is no
 * failure to catch and nothing worth drawing, so those frames are held back
 * and the last good one stays on screen.
 */

interface DataDiagram {
  /** The header that opens this kind of diagram. */
  header: RegExp;
  /** What it allows besides rows. */
  directive: RegExp;
  /** Whether a row carries everything needed to place it. */
  complete: (line: string) => boolean;
}

/** `30d`, `12w`, `500ms` — the length of a gantt bar. */
const duration = /^\d+(?:ms|s|m|h|d|w|y)$/i;

/** A gantt date, in the default `dateFormat`. */
const date = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A gantt row places its bar with what follows the colon: a duration, or a
 * start and an end. A date on its own is a row still being written — the bar
 * has somewhere to begin but nowhere to stop, and comes out with a negative
 * width.
 */
function ganttComplete(line: string): boolean {
  const at = line.indexOf(":");

  if (at === -1) {
    return false;
  }

  const tail = line.slice(at + 1);
  const comma = tail.lastIndexOf(",");
  const last = tail.slice(comma + 1).trim();

  if (duration.test(last)) {
    return true;
  }

  return comma !== -1 && date.test(last);
}

/** A pie row is its label, then the slice's number. */
function pieComplete(line: string): boolean {
  return /:\s*\d+(?:\.\d+)?$/.test(line);
}

/** The types that cannot be laid out from a half-written row. */
const dataDiagrams: DataDiagram[] = [
  {
    header: /^gantt\b/i,
    directive:
      /^(?:gantt|title|dateFormat|axisFormat|tickInterval|excludes|includes|todayMarker|weekday|section|%%)/i,
    complete: ganttComplete,
  },
  {
    header: /^pie\b/i,
    directive: /^(?:pie|title|showData|%%)/i,
    complete: pieComplete,
  },
];

export function canRender(chart: string): boolean {
  let hasRow = false;
  let lastRow = "";

  const shape = dataDiagrams.find((entry) => {
    return entry.header.test(chart.trimStart());
  });

  if (!shape) {
    return true;
  }

  chart.split("\n").forEach((raw) => {
    const row = raw.trim();

    if (row === "" || shape.directive.test(row)) {
      return;
    }

    lastRow = row;

    if (shape.complete(row)) {
      hasRow = true;
    }
  });

  // Nothing placeable yet, or the row still being typed would drag the layout
  // out of shape. Either way this frame is not worth drawing.
  return hasRow && shape.complete(lastRow);
}
