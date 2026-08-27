import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { defaultUi } from "../config";
import type { UiConfig } from "../config";

export interface ReasoningProps {
  /** The model's reasoning, already rendered as markdown. */
  children?: ReactNode;
  /** True while the reasoning is still arriving. */
  stream?: boolean | undefined;
  ui?: UiConfig | undefined;
  renderer?: unknown;
  scrollDown?: unknown;
}

/**
 * A model's reasoning, kept apart from its answer.
 *
 * Open while it streams, so the reader can watch it think, and collapsed the
 * moment it finishes — the answer is what they came for. Anyone who wants to
 * reread the reasoning can open it again.
 */
function ReasoningComponent(props: ReasoningProps) {
  const { children, stream } = props;

  const ui = props.ui ?? defaultUi;
  const { translations, icons } = ui;

  const [open, setOpen] = useState(true);
  const [seconds, setSeconds] = useState(0);

  // Whether the reader has taken over. Until they do, the block follows the
  // stream: open while thinking, closed once done.
  const touched = useRef(false);
  const startedAt = useRef<number | null>(null);

  if (startedAt.current === null) {
    startedAt.current = Date.now();
  }

  useEffect(() => {
    if (stream !== true) {
      return;
    }

    const timer = setInterval(() => {
      setSeconds(Math.round((Date.now() - (startedAt.current ?? 0)) / 1000));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [stream]);

  useEffect(() => {
    if (stream !== true && touched.current === false) {
      setOpen(false);
      setSeconds(Math.round((Date.now() - (startedAt.current ?? 0)) / 1000));
    }
  }, [stream]);

  const toggle = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    touched.current = true;
    setOpen((current) => current !== true);
  }, []);

  const label =
    stream === true
      ? translations.thinking
      : translations.thoughtFor.replace("{seconds}", String(seconds));

  return (
    <div
      className={
        "reasoning-wrapper" +
        (stream === true ? " stream-active" : "") +
        (open ? " open" : " collapsed")
      }
    >
      <div className="reasoning-container">
        <button
          type="button"
          className="reasoning-header"
          onClick={toggle}
          aria-expanded={open}
        >
          <span className="reasoning-title">{label}</span>
          <span
            className="reasoning-chevron"
            dangerouslySetInnerHTML={{ __html: icons.chevron }}
          />
        </button>
        {open ? <div className="reasoning-content">{children}</div> : null}
      </div>
    </div>
  );
}

const Reasoning = memo(ReasoningComponent);

Reasoning.displayName = "Reasoning";

export default Reasoning;
