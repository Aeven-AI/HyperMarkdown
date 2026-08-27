import { Component, Fragment, type ReactNode, type RefObject } from "react";

interface LineNumberProps {
  codeRef: RefObject<HTMLDivElement | null>;
  animation?: boolean | undefined;
  /**
   * How many lines the block holds, when the caller already knows. The
   * streaming cache counts them as it commits them, which saves reading
   * `textContent` back off the DOM — that re-serialises the whole fence on
   * every chunk, so a long block spends more time counting its gutter than
   * rendering its code.
   */
  lineCount?: number | undefined;
}

interface LineNumberState {
  lineNumberTotal: number;
}

class LineNumber extends Component<LineNumberProps, LineNumberState> {
  private countTimeout: ReturnType<typeof setTimeout> | undefined;

  /**
   * The gutter is append-only: line 7 is the same `<span>` no matter how long
   * the block grows. Building the whole run on every chunk allocates a fresh
   * element per line per chunk, which is quadratic over a stream, so the
   * elements are kept and only extended.
   */
  private cachedGroups: ReactNode[] = [];
  private cachedAnimation: boolean | undefined;

  /** Lines per memoised group. Small enough that the tail stays cheap. */
  private static readonly groupSize = 64;

  constructor(props: LineNumberProps) {
    super(props);

    this.state = {
      lineNumberTotal: 0,
    };

    this.lineNumberCount = this.lineNumberCount.bind(this);
  }

  override componentDidMount() {
    const vm = this;

    vm.lineNumberCount();

    // next tick hack
    vm.countTimeout = setTimeout(() => {
      vm.lineNumberCount();
    }, 0);
  }

  override componentDidUpdate(
    _prevProps: Readonly<LineNumberProps>,
    _prevState: Readonly<LineNumberState>,
  ) {
    const vm = this;

    vm.lineNumberCount();
  }

  lineNumberCount() {
    let lineCount;
    let textContent;

    const vm = this;
    const props = vm.props;

    // The streaming cache counts lines as it commits them, so take its total
    // when it is there and leave the DOM alone.
    if (typeof props.lineCount === "number") {
      if (vm.state.lineNumberTotal !== props.lineCount) {
        vm.setState({ lineNumberTotal: props.lineCount });
      }

      return;
    }

    if (props?.codeRef?.current) {
      textContent = props.codeRef.current.textContent || "";
      lineCount = textContent.split("\n").length;

      if (lineCount > 0) {
        lineCount = lineCount - 1;
      }

      if (vm.state.lineNumberTotal !== lineCount) {
        vm.setState({ lineNumberTotal: lineCount });
      }
    }
  }

  override componentWillUnmount() {
    clearTimeout(this.countTimeout);
  }

  /** One entry. */
  private span(index: number, animation: boolean | undefined): ReactNode {
    if (animation === false) {
      return (
        <span className="line-number" key={`l-${index}`}>
          {index + 1}
        </span>
      );
    }

    return (
      <span className="line-number" data-animate-word={true} key={`l-${index}`}>
        {index + 1}
      </span>
    );
  }

  /**
   * The first `total` entries, as whole groups plus the group still filling.
   *
   * Handing React one child per line means it walks every line on every chunk,
   * which is the gutter's real cost once a block is long. A full group never
   * changes again, so returning the identical element lets React skip its
   * subtree outright and only the last group is reconciled.
   */
  private spans(total: number, animation: boolean | undefined): ReactNode[] {
    const vm = this;

    // A different animation setting renders a different span, and a shorter
    // block means the tail is stale; both are rare next to plain growth.
    if (vm.cachedAnimation !== animation) {
      vm.cachedAnimation = animation;
      vm.cachedGroups = [];
    }

    const settled = Math.floor(total / LineNumber.groupSize);

    if (vm.cachedGroups.length > settled) {
      vm.cachedGroups.length = settled;
    }

    while (vm.cachedGroups.length < settled) {
      vm.cachedGroups.push(
        vm.group(vm.cachedGroups.length, LineNumber.groupSize, animation),
      );
    }

    const rest = total - settled * LineNumber.groupSize;

    if (rest === 0) {
      return vm.cachedGroups;
    }

    return vm.cachedGroups.concat(vm.group(settled, rest, animation));
  }

  /** Group `index`, holding `length` entries. */
  private group(
    index: number,
    length: number,
    animation: boolean | undefined,
  ): ReactNode {
    const start = index * LineNumber.groupSize;
    const entries: ReactNode[] = [];
    let offset;

    for (offset = 0; offset < length; offset++) {
      entries.push(this.span(start + offset, animation));
    }

    return <Fragment key={`g-${index}`}>{entries}</Fragment>;
  }

  override render() {
    const vm = this;
    const props = vm.props;

    const lineNumberTotal = vm.state.lineNumberTotal;

    if (lineNumberTotal <= 0) {
      return (
        <span className="line-numbers">
          <span className="line-number" key={`l-1`}>
            1
          </span>
        </span>
      );
    }

    return (
      <span className="line-numbers">
        {vm.spans(lineNumberTotal, props.animation)}
      </span>
    );
  }
}

export default LineNumber;
