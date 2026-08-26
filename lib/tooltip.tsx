import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactElement,
} from "react";

import tippy, { type Instance, type Placement } from "tippy.js";

export interface TooltipProps {
  content?: string;
  placement?: Placement;
  trigger?: string;
  touch?: boolean;
  arrow?: boolean;
  children?: ReactElement;
}

export interface TooltipHandle {
  show(): void;
  hide(): void;
}

/**
 * React adapter for tippy.js, matching the imperative show/hide surface the
 * renderer's toolbars use for their "copied" confirmations. It attaches the
 * reference through props, as required by React 19, instead of reading the
 * removed ReactElement.ref getter.
 */
const Tooltip = forwardRef<TooltipHandle, TooltipProps>(function Tooltip(
  props,
  ref
) {
  const { content, placement, trigger, touch, arrow, children } = props;

  const manual = trigger === "manual";
  const instanceRef = useRef<Instance | null>(null);
  const referenceRef = useRef<Element | null>(null);

  const setReference = useCallback((element: Element | null) => {
    referenceRef.current = element;
  }, []);

  useEffect(() => {
    let instance;

    const reference = referenceRef.current;

    if (!reference) {
      return;
    }

    instance = tippy(reference, {
      content: content ?? "",
      placement,
      touch,
      arrow,
      trigger: manual ? "manual" : trigger ?? "mouseenter",
    });
    instanceRef.current = instance;

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    instanceRef.current?.setProps({
      content: content ?? "",
      placement,
      touch,
      arrow,
      trigger: manual ? "manual" : trigger ?? "mouseenter",
    });
  }, [arrow, content, manual, placement, touch, trigger]);

  useImperativeHandle(
    ref,
    () => ({
      show() {
        instanceRef.current?.show();
      },
      hide() {
        instanceRef.current?.hide();
      },
    }),
    []
  );

  if (!children) {
    return null;
  }

  return cloneElement(
    children as ReactElement<{ ref?: (element: Element | null) => void }>,
    { ref: setReference }
  );
});

Tooltip.displayName = "Tooltip";

export default Tooltip;
