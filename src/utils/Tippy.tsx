import React, { Component } from "react";
import TippyReact from "@tippyjs/react";
import type { Placement } from "tippy.js";

/**
 * Thin wrapper over @tippyjs/react, matching the imperative show/hide surface
 * the renderer's toolbars use for their "copied" confirmations.
 */
interface TippyProps {
  content?: React.ReactNode;
  placement?: Placement;
  trigger?: string;
  touch?: boolean;
  arrow?: boolean;
  children?: React.ReactElement;
}

class Tippy extends Component<TippyProps, { visible: boolean }> {
  constructor(props: TippyProps) {
    super(props);
    this.state = { visible: false };
  }

  show(): void {
    if (this.props.trigger === "manual") {
      this.setState({ visible: true });
    }
  }

  hide(): void {
    if (this.props.trigger === "manual") {
      this.setState({ visible: false });
    }
  }

  render() {
    const { content, placement, trigger, touch, arrow, children } = this.props;
    const manual = trigger === "manual";

    if (!children) {
      return null;
    }

    return (
      <TippyReact
        content={content}
        placement={placement}
        touch={touch}
        arrow={arrow}
        {...(manual
          ? { visible: this.state.visible }
          : { trigger: trigger ?? "mouseenter" })}
      >
        {children}
      </TippyReact>
    );
  }
}

export default Tippy;
