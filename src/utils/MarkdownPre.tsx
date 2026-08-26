import React, { Component, PureComponent } from "react";

import * as runtime from "./runtime";
import Tippy from "./Tippy";



class Header extends Component<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.state = {
      fullscreen: false,
    };

    this.ticking = false;
    this.tippyCopyTimeout = null;

    this.guid = runtime.guid();

    this.headerRef = React.createRef();

    this.tippyFullScreenRef = React.createRef();
    this.tippyCopyContentRef = React.createRef();

    this.copyContent = this.copyContent.bind(this);
    this.openPreviewCode = this.openPreviewCode.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);

    this.updateHeaderScrollClass = this.updateHeaderScrollClass.bind(this);

    this.previewButtonComponent = this.previewButtonComponent.bind(this);
  }

  componentDidMount() {
    const vm = this;
    vm.updateHeaderScrollClass();
    runtime.emitter.on("chat:scroll", vm.guid, vm.updateHeaderScrollClass);
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
        vm.props.codeRef !== nextProps.codeRef ||
        vm.props.language !== nextProps.language
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
    const codeElement = props?.codeRef?.current;

    if (codeElement && codeElement.textContent) {
      navigator.clipboard
        .writeText(codeElement.textContent)
        .then(() => {
          showTippyCopy();
        })
        .catch((err) => {
          console.error("Failed to copy code: ", err);
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

  openPreviewCode(event) {
    event.preventDefault();
    event.stopPropagation();

    const vm = this;
    const props = vm.props;

    const guid = vm.guid;
    const codeElement = props?.codeRef?.current;

    if (props.stream === true) {
      runtime.emitter.dispatchObjectEvent("show:modal", {
        type: "alertModal",
        header: "Rendering code",
        content: "Please wait untill the code is fully rendered",
        buttonText: "Ok",
      });
    } else {
      if (codeElement && codeElement.textContent) {
        runtime.setItem(`preview-${guid}`, codeElement.textContent);

        window.open(`/preview-code/${guid}`, "_blank");
      } else {
        runtime.emitter.dispatchObjectEvent("show:modal", {
          type: "alertModal",
          header: "Code unavailable",
          content: "The code preview is unavailable",
          buttonText: "Ok",
        });
      }
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

          setTimeout(() => {
            vm.updateHeaderScrollClass();
          }, 0);
        }
      });
    } else {
      vm.setState({ fullscreen: false }, () => {
        if (props?.toggleFullScreen) {
          props.toggleFullScreen(false);

          runtime.emitter.dispatchObjectEvent("fullscreen:change", false);

          setTimeout(() => {
            vm.updateHeaderScrollClass();
          }, 0);
        }
      });
    }
  }

  updateHeaderScrollClass(event?: any) {
    const vm = this;

    if (vm.ticking !== true) {
      requestAnimationFrame(() => {
        let rec;
        let top;
        let height;

        const wrapper = vm.props.wrapperRef?.current;

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

  previewButtonComponent(props) {
    const vm = this;
    const language = props.language;
    if (language !== "html") {
      return null;
    } else {
      return (
        <Tippy
          ref={vm.tippyFullScreenRef}
          placement={"top"}
          touch={false}
          trigger={"mouseenter"}
          content={"Preview"}
        >
          <button
            className="codeblock-icon-button first"
            onClick={(event) => {
              vm.openPreviewCode(event);
            }}
          >
            <span className="button-content">
              <span
                className="button-icon play"
                dangerouslySetInnerHTML={{
                  __html:
                    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="circle-play-icon circle-play"><path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"/><circle cx="12" cy="12" r="10"/></svg>',
                }}
              />
            </span>
          </button>
        </Tippy>
      );
    }
  }

  componentWillUnmount() {
    const vm = this;
    runtime.emitter.off("chat:scroll", vm.guid);
  }

  render() {
    let tippyCopyTxt;
    let iconFullScreen;

    const vm = this;
    const props = vm.props;

    const PreviewButtonComponent = vm.previewButtonComponent;

    tippyCopyTxt = "Code copied";

    if (props.stream === true) {
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
      <div ref={vm.headerRef} className="codeblock-header">
        <div className="codeblock-header-content">
          <span className="codeblock-title-container">
            <span className="codeblock-title">{props.language}</span>
          </span>
          <span className="codeblock-spacer" />
          <span className="codeblock-button-container">
            <PreviewButtonComponent {...props} />
            <Tippy
              ref={vm.tippyFullScreenRef}
              placement={"top"}
              touch={false}
              trigger={"mouseenter"}
              content={"Full screen"}
            >
              <button
                className="codeblock-icon-button first"
                onClick={(event) => {
                  vm.toggleFullScreen(event);
                }}
              >
                <span className="button-content">
                  <span
                    className="button-icon"
                    dangerouslySetInnerHTML={{
                      __html: iconFullScreen,
                    }}
                  />
                </span>
              </button>
            </Tippy>
            <Tippy
              ref={vm.tippyCopyContentRef}
              arrow={false}
              trigger={"manual"}
              placement={"top-end"}
              content={tippyCopyTxt}
            >
              <span className="tippy-button">
                <Tippy
                  placement={"top-end"}
                  content={"Copy code"}
                  touch={false}
                  trigger={"mouseenter"}
                >
                  <button
                    className="codeblock-icon-button last"
                    onClick={vm.copyContent}
                  >
                    <span className="button-content">
                      <span
                        className="button-icon"
                        dangerouslySetInnerHTML={{
                          __html:
                            '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
                        }}
                      />
                    </span>
                  </button>
                </Tippy>
              </span>
            </Tippy>
          </span>
        </div>
        <div className="codeblock-header-background">
          <div className="codeblock-header-fade" />
          <div className="codeblock-header-blur" />
        </div>
      </div>
    );
  }
}

class LineNumber extends Component<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.state = {
      lineNumberTotal: 0,
    };

    this.lineNumberCount = this.lineNumberCount.bind(this);
  }

  componentDidMount() {
    const vm = this;
    vm.lineNumberCount();

    // next tick hack
    setTimeout(() => {
      vm.lineNumberCount();
    }, 0);
  }

  componentDidUpdate(prevProps, prevState) {
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

  render() {
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

class MarkdownPre extends PureComponent<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.state = {
      fullscreen: false,
      finalStream: false,
    };

    this.children;

    this.userScroll = false;
    this.scrollMargin = 100;
    this.currentScrollHeight = 0;

    this.lineRegex = /\n/g;

    this.guid = runtime.guid();

    this.codeRef = React.createRef();
    this.wrapperRef = React.createRef();

    this.toggleFullScreen = this.toggleFullScreen.bind(this);

    this.scrollDown = this.scrollDown.bind(this);
    this.scrollDownListener = this.scrollDownListener.bind(this);
  }

  componentDidMount() {
    const vm = this;
  }

  componentDidUpdate(prevProps, prevState) {
    const vm = this;

    if (vm.state.fullscreen === true) {
      vm.scrollDown();
    }
  }

  language() {
    let match;
    let className;

    let language;

    const vm = this;
    const { children } = vm.props;

    language = "Code";

    if (!children) {
      return language;
    } else {
      if (!children.props.className) {
        return language;
      } else {
        className = children.props.className; // e.g., "language-javascript"
        match = /language-(\w+)/.exec(className);

        if (!match) {
          return language;
        } else {
          language = match[1];
          return language;
        }
      }
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

  componentWillUnmount() {
    const vm = this;

    vm.wrapperRef.current.removeEventListener("scroll", vm.scrollDownListener);
  }

  render() {
    let children;
    let stream;
    let fullscreen;

    const vm = this;
    const props = vm.props;
    const state = vm.state;

    const language = vm.language();

    if (props.stream !== true) {
      stream = "";
    } else {
      stream = " stream-active";
    }

    if (state.fullscreen !== true) {
      fullscreen = "";
    } else {
      fullscreen = " fullscreen";
    }

    children = props.children;

    if (vm.children) {
      children = vm.children;
    } else {
      if (props.stream !== true) {
        if (props.animation !== true) {
          setTimeout(() => {
            vm.children = props.preChildren;
            vm.setState({ finalStream: true });
          }, 0);
        } else {
          setTimeout(() => {
            vm.children = props.preChildren;
            vm.setState({ finalStream: true });
          }, 1000);
        }
      }
    }

    return (
      <div
        ref={vm.wrapperRef}
        className={"codeblock-wrapper" + stream + fullscreen}
      >
        <div className="code-container">
          <Header
            stream={props.stream}
            language={language}
            codeRef={vm.codeRef}
            wrapperRef={vm.wrapperRef}
            toggleFullScreen={vm.toggleFullScreen}
          />

          <div className="codeblock-pre-code-content">
            <pre>
              <LineNumber codeRef={vm.codeRef} animation={props.animation} />

              <div ref={vm.codeRef} className="code-content no-scrollbar">
                {children}
              </div>
            </pre>
          </div>
        </div>
      </div>
    );
  }
}

export default MarkdownPre;
