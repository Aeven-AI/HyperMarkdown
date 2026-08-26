import React, { Component } from "react";

import * as runtime from "../platform/runtime";

import Tooltip from "../tooltip";



class Header extends Component<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.state = {
      fullscreen: false,
    };

    this.ticking = false;
    this.tippyCopyTimeout = null;

    this.headerRef = React.createRef();

    this.tippyFullScreenRef = React.createRef();
    this.tippyCopyContentRef = React.createRef();

    this.copyContent = this.copyContent.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);
    this.updateHeaderScrollClass = this.updateHeaderScrollClass.bind(this);
  }

  componentDidMount() {
    const vm = this;
    vm.updateHeaderScrollClass();
    vm.stopWatchingScroll = runtime.onViewportScroll(vm.updateHeaderScrollClass);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const vm = this;

    if (checkProps() === true || checkState() === true) {
      return true;
    } else {
      return false;
    }

    function checkProps() {
      if (
        vm.props.stream !== nextProps.stream ||
        vm.props.mermaidRef !== nextProps.mermaidRef
      ) {
        return true;
      } else {
        return false;
      }
    }

    function checkState() {
      if (vm.state.fullscreen !== nextState.fullscreen) {
        return true;
      } else {
        return false;
      }
    }
  }

  copyContent(event) {
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

  toggleFullScreen(event) {
    event.preventDefault();
    event.stopPropagation();

    const vm = this;
    const props = vm.props;

    if (vm.state.fullscreen !== true) {
      vm.setState({ fullscreen: true }, () => {
        if (props?.toggleFullScreen) {
          props.toggleFullScreen(true);
          runtime.emitter.dispatchObjectEvent("fullscreen:change", true);
        }
      });
    } else {
      vm.setState({ fullscreen: false }, () => {
        if (props?.toggleFullScreen) {
          props.toggleFullScreen(false);
          runtime.emitter.dispatchObjectEvent("fullscreen:change", false);
        }
      });
    }
  }

  updateHeaderScrollClass(_event?: any) {
    const vm = this;

    if (vm.ticking !== true) {
      requestAnimationFrame(() => {
        let rec;
        let top;
        let height;

        const wrapper = vm.props?.wrapperRef?.current;

        if (vm.state.fullscreen === true) {
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

  componentWillUnmount() {
    const vm = this;
    vm.stopWatchingScroll?.();
  }

  render() {
    let title;
    let tippyCopyTxt;
    let iconFullScreen;

    const vm = this;
    const props = vm.props;

    title = "Diagram";

    tippyCopyTxt = "Code copied";
    if (props.stream === "true") {
      tippyCopyTxt = "Code partially copied";
    }

    if (vm.state.fullscreen === true) {
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

class MermaidDiagram extends Component<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.state = {
      data: null,
      loading: true,
      fullscreen: false,
    };

    this.guid = runtime.guid();

    this.mermaidRef = React.createRef();
    this.wrapperRef = React.createRef();

    this.mermaidSandboxes = new Set();

    this.toggleFullScreen = this.toggleFullScreen.bind(this);

    this.scrollDown = this.scrollDown.bind(this);
    this.scrollDownListener = this.scrollDownListener.bind(this);

    this.updateHeaderScrollClass = this.updateHeaderScrollClass.bind(this);
  }

  componentDidMount() {
    const vm = this;
    vm.renderMermaidDiagram();
    vm.updateHeaderScrollClass();
    vm.stopWatchingScroll = runtime.onViewportScroll(vm.updateHeaderScrollClass);
  }

  componentDidUpdate(prevProps) {
    const vm = this;

    if (vm.state.fullscreen === true) {
      vm.scrollDown();
    }

    if (prevProps.chart !== vm.props.chart) {
      vm.renderMermaidDiagram();
    }
  }

  toggleFullScreen(fullscreen) {
    const vm = this;
    vm.setState({ fullscreen: fullscreen }, () => {
      if (vm.state.fullscreen === true) {
        vm.wrapperRef.current.addEventListener("scroll", vm.scrollDownListener);
      } else {
        vm.wrapperRef.current.removeEventListener(
          "scroll",
          vm.scrollDownListener
        );
      }
    });
  }

  renderSandbox() {
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

  removeSandbox(sandbox?: any) {
    const vm = this;

    let targets: any[] = [];

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
    const vm = this;
    const props = vm.props;

    const chart = props.chart;

    const mermaidModule = runtime.getMermaidModule();
    const loadMermaidModule = runtime.loadMermaidModule;

    const sandbox = vm.renderSandbox();

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

    function renderMermaidDiagram(mermaid, renderSandboxRef) {
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

          vm.setState({ data: data, loading: false }, () => {
            if (props.scrollDown) {
              props.scrollDown();
            }
          });
        })
        .catch((_dataError) => {
          vm.removeSandbox(renderSandboxRef);
        });
    }
  }

  scrollDown() {
    const vm = this;

    if (vm.userScroll !== true) {
      if (vm.currentScrollHeight !== vm.wrapperRef.current.scrollHeight) {
        vm.wrapperRef.current.scrollTo({
          top: vm.wrapperRef.current.scrollHeight,
          behavior: "instant",
        });

        vm.currentScrollHeight = vm.wrapperRef.current.scrollHeight;
      }
    }
  }

  scrollDownListener() {
    let scrollTop;
    let scrollHeight;
    let clientHeight;

    const vm = this;

    scrollTop = vm.wrapperRef.current.scrollTop;
    scrollHeight = vm.wrapperRef.current.scrollHeight;
    clientHeight = vm.wrapperRef.current.clientHeight;

    if (scrollTop + clientHeight <= scrollHeight - vm.scrollMargin) {
      vm.userScroll = true;
    } else {
      vm.userScroll = false;
    }
  }

  updateHeaderScrollClass(_event?: any) {
    const vm = this;

    if (vm.ticking !== true) {
      requestAnimationFrame(() => {
        let rec;
        let top;
        let height;

        const wrapper = vm.props?.wrapperRef?.current;

        if (vm.state.fullscreen === true) {
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

  componentWillUnmount() {
    const vm = this;
    if (vm.wrapperRef?.current) {
      vm.wrapperRef.current.removeEventListener(
        "scroll",
        vm.scrollDownListener
      );
    }

    vm.removeSandbox();
  }

  render() {
    let svg;

    let stream;
    let fullscreen;

    const vm = this;

    const props = vm.props;
    const state = vm.state;

    svg = state.data?.svg;

    if (props.stream !== "true") {
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
            mermaidRef={vm.mermaidRef}
            wrapperRef={vm.wrapperRef}
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
