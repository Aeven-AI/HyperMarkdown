import React, {
  Component,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { defaultUi, type UiConfig } from "../config";

interface PanZoomProps {
  enabled: boolean;
  fullscreen: boolean;
  svg: string;
  ui?: UiConfig | undefined;
}

interface PanZoomState {
  panning: boolean;
  zoom: number;
}

const INITIAL_ZOOM = 1;
const MAX_ZOOM = 3;
const MIN_ZOOM = 0.5;
const ZOOM_STEP = 0.1;

/**
 * How long a press waits before it starts repeating, and how fast it repeats
 * after that. The delay is what separates a click from a hold: below it every
 * press would run away from the reader.
 */
const HOLD_DELAY = 350;
const HOLD_INTERVAL = 80;

/**
 * A dependency-free interaction layer around Mermaid's rendered SVG.
 *
 * Panning writes one compositor transform per animation frame instead of
 * asking React to reconcile the SVG for every pointer event. Zoom changes are
 * stateful so the buttons and their disabled states stay accessible.
 */
class PanZoom extends Component<PanZoomProps, PanZoomState> {
  private activePointerId: number | null = null;
  private holdTimeout: ReturnType<typeof setTimeout> | null = null;
  private holdInterval: ReturnType<typeof setInterval> | null = null;
  private holdRepeated = false;
  private frame: number | null = null;
  private panX = 0;
  private panY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private readonly contentRef = React.createRef<HTMLDivElement>();
  private readonly rootRef = React.createRef<HTMLDivElement>();

  constructor(props: PanZoomProps) {
    super(props);

    this.state = {
      panning: false,
      zoom: INITIAL_ZOOM,
    };

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.resetView = this.resetView.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.holdZoomIn = this.holdZoomIn.bind(this);
    this.holdZoomOut = this.holdZoomOut.bind(this);
    this.endHold = this.endHold.bind(this);
  }

  override componentDidMount() {
    const vm = this;

    if (vm.props.enabled === true) {
      vm.rootRef.current?.addEventListener("wheel", vm.handleWheel, {
        passive: false,
      });
    }
  }

  override componentDidUpdate(prevProps: Readonly<PanZoomProps>) {
    const vm = this;

    if (prevProps.enabled === true && vm.props.enabled !== true) {
      vm.rootRef.current?.removeEventListener("wheel", vm.handleWheel);
      vm.resetView();
    } else if (prevProps.enabled !== true && vm.props.enabled === true) {
      vm.rootRef.current?.addEventListener("wheel", vm.handleWheel, {
        passive: false,
      });
    }
  }

  override componentWillUnmount() {
    const vm = this;

    if (vm.frame !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(vm.frame);
    }

    vm.rootRef.current?.removeEventListener("wheel", vm.handleWheel);
    vm.endHold();
  }

  zoomIn() {
    const vm = this;

    // A hold has already zoomed; the click that ends it must not add a step.
    if (vm.holdRepeated === true) {
      vm.holdRepeated = false;
      return;
    }

    vm.changeZoom(ZOOM_STEP);
  }

  zoomOut() {
    const vm = this;

    if (vm.holdRepeated === true) {
      vm.holdRepeated = false;
      return;
    }

    vm.changeZoom(-ZOOM_STEP);
  }

  holdZoomIn() {
    this.startHold(ZOOM_STEP);
  }

  holdZoomOut() {
    this.startHold(-ZOOM_STEP);
  }

  /**
   * Stop repeating. Bound to every way a press can end — released, cancelled,
   * or dragged off the button — so a hold cannot outlive the finger.
   */
  endHold() {
    const vm = this;

    if (vm.holdTimeout !== null) {
      clearTimeout(vm.holdTimeout);
      vm.holdTimeout = null;
    }

    if (vm.holdInterval !== null) {
      clearInterval(vm.holdInterval);
      vm.holdInterval = null;
    }
  }

  resetView() {
    const vm = this;

    vm.panX = 0;
    vm.panY = 0;
    vm.activePointerId = null;
    vm.setState({ panning: false, zoom: INITIAL_ZOOM });
  }

  handleWheel(event: WheelEvent) {
    let delta;

    const vm = this;

    if (vm.props.enabled !== true || event.deltaY === 0) {
      return;
    }

    // The page has to keep scrolling under the pointer. A diagram that took
    // every wheel event would trap the reader each time one passed beneath
    // the cursor, and a document with a dozen diagrams is mostly diagram.
    //
    // Ctrl is what the browser itself zooms on, and a trackpad pinch arrives
    // as a wheel event with ctrlKey already set — so pinching still zooms the
    // diagram, and two fingers still scroll the page.
    if (event.ctrlKey !== true && event.metaKey !== true) {
      return;
    }

    event.preventDefault();
    delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    vm.changeZoom(delta);
  }

  handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const vm = this;

    if (
      vm.props.enabled !== true ||
      event.button !== 0 ||
      event.isPrimary === false
    ) {
      return;
    }

    event.preventDefault();
    vm.activePointerId = event.pointerId;
    vm.pointerStartX = event.clientX;
    vm.pointerStartY = event.clientY;
    vm.panStartX = vm.panX;
    vm.panStartY = vm.panY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    vm.setState({ panning: true });
  }

  handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const vm = this;

    if (
      vm.activePointerId === null ||
      vm.activePointerId !== event.pointerId
    ) {
      return;
    }

    event.preventDefault();
    vm.panX = vm.panStartX + event.clientX - vm.pointerStartX;
    vm.panY = vm.panStartY + event.clientY - vm.pointerStartY;
    vm.scheduleTransform();
  }

  handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const vm = this;

    if (
      vm.activePointerId === null ||
      vm.activePointerId !== event.pointerId
    ) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    vm.activePointerId = null;
    vm.setState({ panning: false });
  }

  override render() {
    let className;

    const vm = this;
    const props = vm.props;
    const state = vm.state;
    const ui = props.ui ?? defaultUi;
    const { icons, translations } = ui;

    className = "mermaid-pan-zoom";
    if (props.fullscreen === true) {
      className += " fullscreen";
    }
    if (state.panning === true) {
      className += " panning";
    }

    return (
      <div
        ref={vm.rootRef}
        className={className}
        data-pan-zoom={props.enabled === true ? "true" : "false"}
      >
        {props.enabled !== true ? null : (
          <div className="mermaid-pan-zoom-controls">
            <button
              type="button"
              className="mermaid-pan-zoom-button first"
              aria-label={translations.zoomIn}
              title={translations.zoomIn}
              disabled={state.zoom >= MAX_ZOOM}
              onClick={vm.zoomIn}
              onPointerDown={vm.holdZoomIn}
              onPointerUp={vm.endHold}
              onPointerLeave={vm.endHold}
              onPointerCancel={vm.endHold}
            >
              <span
                className="button-icon"
                dangerouslySetInnerHTML={{ __html: icons.zoomIn }}
              ></span>
            </button>
            <button
              type="button"
              className="mermaid-pan-zoom-button"
              aria-label={translations.zoomOut}
              title={translations.zoomOut}
              disabled={state.zoom <= MIN_ZOOM}
              onClick={vm.zoomOut}
              onPointerDown={vm.holdZoomOut}
              onPointerUp={vm.endHold}
              onPointerLeave={vm.endHold}
              onPointerCancel={vm.endHold}
            >
              <span
                className="button-icon"
                dangerouslySetInnerHTML={{ __html: icons.zoomOut }}
              ></span>
            </button>
            <button
              type="button"
              className="mermaid-pan-zoom-button last"
              aria-label={translations.resetView}
              title={translations.resetView}
              onClick={vm.resetView}
            >
              <span
                className="button-icon"
                dangerouslySetInnerHTML={{ __html: icons.resetView }}
              ></span>
            </button>
          </div>
        )}
        {/*
          The content moves; this does not. The edge fade is a mask on the
          viewport, so it stays pinned to the border while the diagram scales
          and pans underneath — on the content it would scale with it.
        */}
        <div className="mermaid-pan-zoom-viewport">
          <div
            ref={vm.contentRef}
            className="mermaid-pan-zoom-content"
            onPointerDown={vm.handlePointerDown}
            onPointerMove={vm.handlePointerMove}
            onPointerUp={vm.handlePointerUp}
            onPointerCancel={vm.handlePointerUp}
            style={{ transform: vm.transform() }}
          >
            <div
              className="mermaid-svg"
              role="img"
              aria-label={translations.diagram}
              dangerouslySetInnerHTML={{ __html: props.svg }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Begin a press-and-hold. The first step is the click's to make, so this
   * only waits, then repeats: holding the button walks the zoom rather than
   * asking for a click per tenth.
   */
  private startHold(delta: number) {
    const vm = this;

    vm.endHold();
    vm.holdRepeated = false;

    vm.holdTimeout = setTimeout(() => {
      vm.holdRepeated = true;
      vm.holdInterval = setInterval(() => {
        vm.changeZoom(delta);
      }, HOLD_INTERVAL);
    }, HOLD_DELAY);
  }

  private changeZoom(delta: number) {
    const vm = this;

    vm.setState((state) => {
      let zoom;

      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom + delta));
      zoom = Number(zoom.toFixed(4));

      return { zoom: zoom };
    });
  }

  private scheduleTransform() {
    const vm = this;

    if (vm.frame !== null || typeof window === "undefined") {
      return;
    }

    vm.frame = window.requestAnimationFrame(() => {
      const content = vm.contentRef.current;

      vm.frame = null;
      if (content) {
        content.style.transform = vm.transform();
      }
    });
  }

  private transform() {
    const vm = this;

    return `translate(${vm.panX}px, ${vm.panY}px) scale(${vm.state.zoom})`;
  }
}

export default PanZoom;
