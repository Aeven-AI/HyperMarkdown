import React, { Component, type MouseEvent, type RefObject } from "react";

import * as runtime from "../runtime";
import type { Emitter } from "../runtime";
import { defaultUi } from "../config";
import type { UiConfig } from "../config";
import Tooltip, { type TooltipHandle } from "../tooltip";

interface HeaderProps {
  /** This renderer's own bus, so blocks report only to the renderer that made them. */
  events?: Emitter | undefined;
  ui?: UiConfig | undefined;
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
    vm.stopWatchingScroll = runtime.onViewportScroll(
      vm.updateHeaderScrollClass,
    );
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
    props.events?.dispatchObjectEvent("fullscreen:change", fullscreen);
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

    const ui = props.ui ?? defaultUi;
    const { translations, icons } = ui;
    const controls = ui.controls.diagram;

    title = translations.diagram;

    tippyCopyTxt = translations.codeCopied;
    if (props.stream === true || props.stream === "true") {
      tippyCopyTxt = translations.codePartiallyCopied;
    }

    if (props.fullscreen === true) {
      iconFullScreen = icons.minimize;
    } else {
      iconFullScreen = icons.maximize;
    }

    return (
      <div ref={vm.headerRef} className="mermaid-header">
        <div className="mermaid-header-content">
          <span className="mermaid-title-container">
            <span className="mermaid-title">{title}</span>
          </span>
          <span className="mermaid-spacer" />
          <span className="mermaid-button-container">
            {controls.fullscreen === false ? null : (
              <Tooltip
                ref={vm.tippyFullScreenRef}
                placement={"top"}
                touch={false}
                trigger={"mouseenter"}
                content={translations.fullScreen}
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
            )}
            {controls.copy === false ? null : (
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
                    content={translations.copy}
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
                            __html: icons.copy,
                          }}
                        ></span>
                      </span>
                    </button>
                  </Tooltip>
                </span>
              </Tooltip>
            )}
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

export default Header;
