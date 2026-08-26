import {
  forwardRef,
  useImperativeHandle,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

import TippyReact from "@tippyjs/react";
import type { Placement } from "tippy.js";

export interface TippyProps {
  content?: ReactNode;
  placement?: Placement;
  trigger?: string;
  touch?: boolean;
  arrow?: boolean;
  children?: ReactElement;
}

export interface TippyHandle {
  show(): void;
  hide(): void;
}

/**
 * Thin wrapper over @tippyjs/react, matching the imperative show/hide surface
 * the renderer's toolbars use for their "copied" confirmations. Only tooltips
 * with `trigger="manual"` answer to the handle; the rest follow the pointer.
 */
const Tippy = forwardRef<TippyHandle, TippyProps>(function Tippy(props, ref) {
  const { content, placement, trigger, touch, arrow, children } = props;

  const manual = trigger === "manual";
  const [visible, setVisible] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      show() {
        if (manual) {
          setVisible(true);
        }
      },
      hide() {
        if (manual) {
          setVisible(false);
        }
      },
    }),
    [manual]
  );

  if (!children) {
    return null;
  }

  return (
    <TippyReact
      content={content}
      placement={placement}
      touch={touch}
      arrow={arrow}
      {...(manual ? { visible } : { trigger: trigger ?? "mouseenter" })}
    >
      {children}
    </TippyReact>
  );
});

Tippy.displayName = "Tippy";

export default Tippy;
