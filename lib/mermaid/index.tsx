import React, { Component } from "react";

import type { Emitter } from "../runtime";
import type { UiConfig } from "../config";
import type {
  DiagramEngine,
  DiagramPlugin,
  DiagramResult,
} from "../plugin-types";

import Header from "./header";
import { canRender } from "./renderable";

export interface MermaidDiagramProps {
  chart: string;
  stream?: boolean | string | undefined;
  renderer?: unknown;
  diagram?: DiagramPlugin | undefined;
  events?: Emitter | undefined;
  ui?: UiConfig | undefined;
  scrollDown?: (() => void) | undefined;
}

interface MermaidDiagramState {
  data: DiagramResult | null;
  fullscreen: boolean;
}

class MermaidDiagram extends Component<
  MermaidDiagramProps,
  MermaidDiagramState
> {
  private readonly mermaidRef = React.createRef<HTMLDivElement>();
  private readonly wrapperRef = React.createRef<HTMLDivElement>();
  private readonly mermaidSandboxes = new Set<HTMLDivElement>();
  private userScroll = false;
  private readonly scrollMargin = 100;
  private currentScrollHeight = 0;
  private mounted = false;

  constructor(props: MermaidDiagramProps) {
    super(props);

    this.state = {
      data: null,
      fullscreen: false,
    };

    this.toggleFullScreen = this.toggleFullScreen.bind(this);

    this.scrollDown = this.scrollDown.bind(this);
    this.scrollDownListener = this.scrollDownListener.bind(this);
  }

  override componentDidMount() {
    const vm = this;
    vm.mounted = true;
    vm.renderMermaidDiagram();
  }

  override componentDidUpdate(prevProps: Readonly<MermaidDiagramProps>) {
    const vm = this;

    if (vm.state.fullscreen === true) {
      vm.scrollDown();
    }

    if (prevProps.chart !== vm.props.chart) {
      vm.renderMermaidDiagram();
    }
  }

  toggleFullScreen(fullscreen: boolean) {
    let wrapper;

    const vm = this;
    vm.setState({ fullscreen: fullscreen }, () => {
      wrapper = vm.wrapperRef.current;

      if (!wrapper) {
        return;
      }

      if (vm.state.fullscreen === true) {
        wrapper.addEventListener("scroll", vm.scrollDownListener);
      } else {
        wrapper.removeEventListener("scroll", vm.scrollDownListener);
      }
    });
  }

  renderSandbox(): HTMLDivElement | null {
    let sandbox;

    const vm = this;

    if (typeof document === "undefined") {
      return null;
    } else {
      sandbox = document.createElement("div");
      sandbox.className = "mermaid-render-sandbox";
      sandbox.setAttribute("aria-hidden", "true");

      document.body.appendChild(sandbox);
      vm.mermaidSandboxes.add(sandbox);

      return sandbox;
    }
  }

  removeSandbox(sandbox?: HTMLDivElement | null) {
    let targets: HTMLDivElement[];

    const vm = this;

    targets = [];

    if (sandbox && vm.mermaidSandboxes?.has(sandbox)) {
      targets = [sandbox];
    } else if (!sandbox && vm.mermaidSandboxes) {
      targets = Array.from(vm.mermaidSandboxes);
    }

    targets.forEach((element) => {
      if (!element) {
        return;
      }

      element.textContent = "";
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }

      vm.mermaidSandboxes.delete(element);
    });
  }

  renderMermaidDiagram() {
    let sandbox: HTMLDivElement | null;

    const vm = this;
    const props = vm.props;

    const chart = props.chart;

    const diagram = props.diagram;

    if (chart === "" || !diagram) {
      return;
    }

    // Mid-stream the source can be too unfinished to lay out, in a way the
    // engine reports by drawing a broken diagram rather than by failing. Keep
    // the frame already on screen and wait for the next delta.
    if (!canRender(chart)) {
      return;
    }

    sandbox = vm.renderSandbox();

    // Already loaded: render on this tick, so a second diagram does not wait a
    // microtask behind a promise that is already settled.
    const engine = diagram.loaded();

    if (engine) {
      renderMermaidDiagram(engine, sandbox);
    } else {
      diagram
        .load()
        .then((loaded) => {
          renderMermaidDiagram(loaded, sandbox);
        })
        .catch(() => {
          vm.removeSandbox(sandbox);
        });
    }

    function renderMermaidDiagram(
      mermaid: DiagramEngine,
      renderSandboxRef: HTMLDivElement | null,
    ) {
      const hash = chart.split("").reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0);

      const uniqueId = `mermaid-${Math.abs(hash)}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      mermaid
        .render(uniqueId, chart, renderSandboxRef || undefined)
        .then((data) => {
          vm.removeSandbox(renderSandboxRef);

          if (vm.mounted === true) {
            vm.setState({ data: data }, () => {
              props.scrollDown?.();
            });
          }
        })
        .catch(() => {
          vm.removeSandbox(renderSandboxRef);
        });
    }
  }

  scrollDown() {
    let wrapper;

    const vm = this;
    wrapper = vm.wrapperRef.current;

    if (wrapper && vm.userScroll !== true) {
      if (vm.currentScrollHeight !== wrapper.scrollHeight) {
        wrapper.scrollTo({
          top: wrapper.scrollHeight,
          behavior: "instant",
        });

        vm.currentScrollHeight = wrapper.scrollHeight;
      }
    }
  }

  scrollDownListener() {
    let scrollTop;
    let scrollHeight;
    let clientHeight;

    const vm = this;
    const wrapper = vm.wrapperRef.current;

    if (!wrapper) {
      return;
    }

    scrollTop = wrapper.scrollTop;
    scrollHeight = wrapper.scrollHeight;
    clientHeight = wrapper.clientHeight;

    if (scrollTop + clientHeight <= scrollHeight - vm.scrollMargin) {
      vm.userScroll = true;
    } else {
      vm.userScroll = false;
    }
  }

  override componentWillUnmount() {
    const vm = this;
    vm.mounted = false;
    if (vm.wrapperRef?.current) {
      vm.wrapperRef.current.removeEventListener(
        "scroll",
        vm.scrollDownListener,
      );
    }

    vm.removeSandbox();
  }

  override render() {
    let svg;

    let stream;
    let fullscreen;

    const vm = this;

    const props = vm.props;
    const state = vm.state;

    svg = state.data?.svg ?? "";

    if (props.stream !== true && props.stream !== "true") {
      stream = "";
    } else {
      stream = " stream-active";
    }

    if (state.fullscreen !== true) {
      fullscreen = "";
    } else {
      fullscreen = " fullscreen";
    }

    return (
      <div
        ref={vm.wrapperRef}
        className={"mermaid-wrapper" + stream + fullscreen}
      >
        <div className="mermaid-container">
          <Header
            events={props.events}
            ui={props.ui}
            stream={props.stream}
            chart={props.chart}
            wrapperRef={vm.wrapperRef}
            fullscreen={state.fullscreen}
            toggleFullScreen={vm.toggleFullScreen}
          />
          <div className="mermaid-content">
            <div className="mermaid-scroll no-scrollbar">
              <div
                ref={vm.mermaidRef}
                className="mermaid-svg"
                dangerouslySetInnerHTML={{ __html: svg }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MermaidDiagram;
