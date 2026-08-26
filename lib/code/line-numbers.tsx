import { Component, type RefObject } from "react";

interface LineNumberProps {
  codeRef: RefObject<HTMLDivElement | null>;
  animation?: boolean | undefined;
}

interface LineNumberState {
  lineNumberTotal: number;
}

class LineNumber extends Component<LineNumberProps, LineNumberState> {
  private countTimeout: ReturnType<typeof setTimeout> | undefined;

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

  override render() {
    const vm = this;
    const state = vm.state;
    const props = vm.props;
    const lineNumberTotal = state.lineNumberTotal;

    if (lineNumberTotal === 0) {
      return (
        <span className="line-numbers">
          <span className="line-number" key={`l-1`}>
            1
          </span>
        </span>
      );
    } else {
      if (props.animation === false) {
        return (
          <span className="line-numbers">
            {Array.from({ length: lineNumberTotal }, (_, i) => (
              <span className="line-number" key={`l-${i}`}>
                {i + 1}
              </span>
            ))}
          </span>
        );
      } else {
        return (
          <span className="line-numbers">
            {Array.from({ length: lineNumberTotal }, (_, i) => (
              <span
                className="line-number"
                data-animate-word={true}
                key={`l-${i}`}
              >
                {i + 1}
              </span>
            ))}
          </span>
        );
      }
    }
  }
}

export default LineNumber;
