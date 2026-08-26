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
        vm.props.tableRef !== nextProps.tableRef
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
    const tableElement = props?.tableRef?.current;

    // Use .textContent to preserve whitespace and newlines
    if (tableElement) {
      navigator.clipboard
        .writeText(tableElement.innerText)
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

  componentWillUnmount() {
    const vm = this;
    runtime.emitter.off("chat:scroll", vm.guid);
  }

  render() {
    let tippyCopyTxt;
    let iconFullScreen;

    const vm = this;
    const props = vm.props;

    tippyCopyTxt = "Table copied";

    if (props.stream === true) {
      tippyCopyTxt = "Table partially copied";
    }

    if (vm.state.fullscreen === true) {
      iconFullScreen =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="minimize2-icon minimize-2"><path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/></svg>';
    } else {
      iconFullScreen =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="maximize2-icon maximize-2"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></svg>';
    }

    return (
      <div ref={vm.headerRef} className="table-header">
        <div className="table-header-content">
          <span className="table-title-container">
            <span className="table-title">Table</span>
          </span>
          <span className="table-spacer" />
          <span className="table-button-container">
            <Tippy
              ref={vm.tippyFullScreenRef}
              placement={"top"}
              touch={false}
              trigger={"mouseenter"}
              content={"Full screen"}
            >
              <button
                className="table-icon-button first"
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
                  content={"Copy"}
                  touch={false}
                  trigger={"mouseenter"}
                >
                  <button
                    className="table-icon-button last"
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
                </Tippy>
              </span>
            </Tippy>
          </span>
        </div>
        <div className="table-header-background">
          <div className="table-header-fade" />
          <div className="table-header-blur" />
        </div>
      </div>
    );
  }
}

class MarkdownTable extends PureComponent<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.state = {
      fullscreen: false,
    };

    this.headless = true;
    this.headerColumns = 0;

    this.headlessReady = false;
    this.headerColumnsReady = false;

    this.userScroll = false;
    this.scrollMargin = 100;
    this.currentScrollHeight = 0;

    this.tableRef = React.createRef();
    this.wrapperRef = React.createRef();

    this.toggleFullScreen = this.toggleFullScreen.bind(this);

    this.scrollDown = this.scrollDown.bind(this);
    this.scrollDownListener = this.scrollDownListener.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    const vm = this;

    if (vm.state.fullscreen === true) {
      vm.scrollDown();
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

  setTableProperties() {
    let i;
    let iCount;

    let j;
    let jCount;

    let thead;

    let headRow;
    let headCells;
    let bodyRows;

    let tableChildren;

    let headless;
    let headerColumns;

    const vm = this;
    const { children } = vm.props;

    if (vm.headlessReady === true && vm.headerColumnsReady === true) {
      return;
    } else {
      headless = true;

      headerColumns = 0;

      // A header with no rows is a single child, and a one-column header row a
      // single cell. React hands those over unwrapped, so counting by .length
      // silently skips the table and leaves it looking headless.
      tableChildren = React.Children.toArray(children);

      for (i = 0, iCount = tableChildren.length; i < iCount; i++) {
        if (tableChildren[i].type === "thead") {
          thead = tableChildren[i];

          headRow = React.Children.toArray(thead.props.children)[0];
          headCells = headRow
            ? React.Children.toArray(headRow.props.children)
            : [];

          for (j = 0, jCount = headCells.length; j < jCount; j++) {
            if (headCells[j].type === "th") {
              headerColumns++;
              if (headCells[j]?.props?.children) {
                headless = false;
              }
            }
          }
        }

        if (tableChildren[i].type === "tbody") {
          bodyRows = React.Children.toArray(tableChildren[i].props.children);

          if (bodyRows.length > 2) {
            vm.headlessReady = true;
          }
        }
      }

      vm.headless = headless;

      if (vm.headerColumnsReady !== true) {
        if (headerColumns >= vm.headerColumns) {
          vm.headerColumns = headerColumns;
        } else {
          vm.headerColumnsReady = true;
        }
      }
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

  componentWillUnmount() {
    const vm = this;
    vm.wrapperRef.current.removeEventListener("scroll", vm.scrollDownListener);
  }

  render() {
    let stream;
    let fullscreen;

    const vm = this;
    const props = vm.props;
    const state = vm.state;

    const { renderer: _, scrollDown: __, stream: ___, ...comProps } = props;

    vm.setTableProperties();

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

    return (
      <div
        ref={vm.wrapperRef}
        className={"table-wrapper" + stream + fullscreen}
      >
        <div className="table-container">
          <Header
            stream={props.stream}
            tableRef={vm.tableRef}
            wrapperRef={vm.wrapperRef}
            toggleFullScreen={vm.toggleFullScreen}
          />
          <div className="table-content">
            <div className="table-scroll no-scrollbar">
              <table
                {...comProps}
                ref={vm.tableRef}
                data-headless={vm.headless}
                data-header-columns={vm.headerColumns}
              >
                {props.children}
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MarkdownTable;
