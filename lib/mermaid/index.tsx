import React, {
  Component,
  type MouseEvent,
  type RefObject,
} from "react";

import type { Mermaid, RenderResult } from "mermaid";

import * as runtime from "../platform/runtime";

import Tooltip, { type TooltipHandle } from "../tooltip";

interface HeaderProps {
  stream?: boolean | string | undefined;
  chart: string;
  fullscreen: boolean;
  wrapperRef: RefObject<HTMLDivElement | null>;
  toggleFullScreen(fullscreen: boolean): void;
}

class Header extends Component<HeaderProps> {
  private ticking = false;
  private tippyCopyTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly headerRef = React.createRef<HTMLDivElement>();
  private readonly tippyFullScreenRef = React.createRef<TooltipHandle>();
  private readonly tippyCopyContentRef = React.createRef<TooltipHandle>();
  private stopWatchingScroll: (() => void) | undefined;

  constructor(props: HeaderProps) {
    super(props);

    this.copyContent = this.copyContent.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.updateHeaderScrollClass = this.updateHeaderScrollClass.bind(this);
  }

  override componentDidMount() {
    const vm = this;
    vm.updateHeaderScrollClass();
    vm.stopWatchingScroll = runtime.onViewportScroll(vm.updateHeaderScrollClass);
  }

  override shouldComponentUpdate(nextProps: HeaderProps) {
    const vm = this;

    if (checkProps() === true) {
      return true;
    } else {
      return false;
    }

    function checkProps() {
      if (
        vm.props.stream !== nextProps.stream ||
        vm.props.chart !== nextProps.chart ||
        vm.props.fullscreen !== nextProps.fullscreen
      ) {
        return true;
      } else {
        return false;
      }
    }

  }

  copyContent(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const vm = this;
    const props = vm.props;

    if (props.chart) {
      navigator.clipboard
        .writeText(props.chart)
        .then(() => {
          showTippyCopy();
        })
        .catch((err) => {
          console.log(err);
        });
    }

    function showTippyCopy() {
      vm.tippyCopyContentRef?.current?.show();

      clearTimeout(vm.tippyCopyTimeout);
      vm.tippyCopyTimeout = setTimeout(() => {
        vm.tippyCopyContentRef?.current?.hide();
      }, 600);
    }
  }

  toggleFullScreen(event: MouseEvent<HTMLButtonElement>) {
    let fullscreen;

    event.preventDefault();
    event.stopPropagation();

    const vm = this;
    const props = vm.props;

    fullscreen = props.fullscreen !== true;
    props.toggleFullScreen(fullscreen);
    runtime.emitter.dispatchObjectEvent("fullscreen:change", fullscreen);
  }

  updateHeaderScrollClass() {
    const vm = this;

    if (vm.ticking !== true) {
      requestAnimationFrame(() => {
        let rec;
        let top;
        let height;

        const wrapper = vm.props?.wrapperRef?.current;

        if (vm.props.fullscreen === true) {
          vm.headerRef?.current?.classList?.remove("scroll");
        } else {
          if (wrapper) {
            rec = wrapper.getBoundingClientRect();
            top = rec?.top || 0;
            height = rec?.height || 0;

            if (top >= 56) {
              vm.headerRef?.current?.classList?.remove("scroll");
            } else {
              if (height + top > 106) {
                vm.headerRef?.current?.classList?.add("scroll");
              } else {
                vm.headerRef?.current?.classList?.remove("scroll");
              }
            }
          }
        }

        vm.ticking = false;
      });

      vm.ticking = true;
    }
  }

  override componentWillUnmount() {
    const vm = this;
    vm.stopWatchingScroll?.();
  }

  override render() {
    let title;
    let tippyCopyTxt;
    let iconFullScreen;

    const vm = this;
    const props = vm.props;

    title = "Diagram";

    tippyCopyTxt = "Code copied";
    if (props.stream === true || props.stream === "true") {
      tippyCopyTxt = "Code partially copied";
    }

    if (props.fullscreen === true) {
      iconFullScreen =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="minimize2-icon minimize-2"><path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/></svg>';
    } else {
      iconFullScreen =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="maximize2-icon maximize-2"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></svg>';
    }

    return (
      <div ref={vm.headerRef} className="mermaid-header">
        <div className="mermaid-header-content">
          <span className="mermaid-title-container">
            <span className="mermaid-title">{title}</span>
          </span>
          <span className="mermaid-spacer" />
          <span className="mermaid-button-container">
            <Tooltip
              ref={vm.tippyFullScreenRef}
              placement={"top"}
              touch={false}
              trigger={"mouseenter"}
              content={"Full screen"}
            >
              <button
                type="button"
                className="mermaid-icon-button first"
                onClick={vm.toggleFullScreen}
              >
                <span className="button-content">
                  <span
                    className="button-icon"
                    dangerouslySetInnerHTML={{
                      __html: iconFullScreen,
                    }}
                  ></span>
                </span>
              </button>
            </Tooltip>
            <Tooltip
              ref={vm.tippyCopyContentRef}
              arrow={false}
              trigger={"manual"}
              placement={"top-end"}
              content={tippyCopyTxt}
            >
              <span className="tippy-button">
                <Tooltip
                  placement={"top-end"}
                  content={"Copy"}
                  touch={false}
                  trigger={"mouseenter"}
                >
                  <button
                    type="button"
                    className="mermaid-icon-button last"
                    onClick={vm.copyContent}
                  >
                    <span className="button-content">
                      <span
                        className="button-icon"
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
                        }}
                      ></span>
                    </span>
                  </button>
                </Tooltip>
              </span>
            </Tooltip>
          </span>
        </div>
        <div className="mermaid-header-background">
          <div className="mermaid-header-fade" />
          <div className="mermaid-header-blur" />
        </div>
      </div>
    );
  }
}

export interface MermaidDiagramProps {
  chart: string;
  stream?: boolean | string | undefined;
  renderer?: unknown;
  scrollDown?: (() => void) | undefined;
}

interface MermaidDiagramState {
  data: RenderResult | null;
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

    const mermaidModule = runtime.getMermaidModule();
    const loadMermaidModule = runtime.loadMermaidModule;

    if (chart === "") {
      return;
    }

    sandbox = vm.renderSandbox();

    if (!mermaidModule) {
      loadModule();
    } else {
      renderMermaidDiagram(mermaidModule, sandbox);
    }

    function loadModule() {
      loadMermaidModule()
        .then((mermaid) => {
          renderMermaidDiagram(mermaid, sandbox);
        })
        .catch((_mermaidError) => {
          vm.removeSandbox(sandbox);
        });
    }

    function renderMermaidDiagram(
      mermaid: Mermaid,
      renderSandboxRef: HTMLDivElement | null
    ) {
      const hash = chart.split("").reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0);

      const uniqueId = `mermaid-${Math.abs(hash)}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      mermaid
        .render(uniqueId, chart, renderSandboxRef || undefined)
        .then((data: RenderResult) => {
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
        vm.scrollDownListener
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
