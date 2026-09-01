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
  stream?: boolean | undefined;
  language: string;
  fullscreen: boolean;
  codeRef: RefObject<HTMLDivElement | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  toggleFullScreen(fullscreen: boolean): void;
}

class Header extends Component<HeaderProps> {
  private ticking = false;
  private tippyCopyTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly guid = runtime.guid();
  private readonly headerRef = React.createRef<HTMLDivElement>();
  private readonly tippyFullScreenRef = React.createRef<TooltipHandle>();
  private readonly tippyCopyContentRef = React.createRef<TooltipHandle>();
  private stopWatchingScroll: (() => void) | undefined;

  constructor(props: HeaderProps) {
    super(props);

    this.copyContent = this.copyContent.bind(this);
    this.openPreviewCode = this.openPreviewCode.bind(this);
    this.toggleFullScreen = this.toggleFullScreen.bind(this);

    this.updateHeaderScrollClass = this.updateHeaderScrollClass.bind(this);

    this.previewButtonComponent = this.previewButtonComponent.bind(this);
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
        vm.props.codeRef !== nextProps.codeRef ||
        vm.props.language !== nextProps.language ||
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

  openPreviewCode(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const vm = this;
    const props = vm.props;

    const guid = vm.guid;
    const ui = props.ui ?? defaultUi;
    const codeElement = props?.codeRef?.current;

    if (props.stream === true) {
      props.events?.dispatchObjectEvent("show:modal", {
        type: "alertModal",
        header: ui.translations.previewPendingTitle,
        content: ui.translations.previewPendingBody,
        buttonText: ui.translations.dismiss,
      });
    } else {
      if (codeElement && codeElement.textContent) {
        runtime.setItem(`preview-${guid}`, codeElement.textContent);

        window.open(`/preview-code/${guid}`, "_blank");
      } else {
        props.events?.dispatchObjectEvent("show:modal", {
          type: "alertModal",
          header: ui.translations.previewUnavailableTitle,
          content: ui.translations.previewUnavailableBody,
          buttonText: ui.translations.dismiss,
        });
      }
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

    setTimeout(() => {
      vm.updateHeaderScrollClass();
    }, 0);
  }

  updateHeaderScrollClass() {
    const vm = this;

    if (vm.ticking !== true) {
      requestAnimationFrame(() => {
        let rec;
        let top;
        let height;

        const wrapper = vm.props.wrapperRef?.current;

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

  previewButtonComponent(props: HeaderProps) {
    const vm = this;
    const language = props.language;
    const ui = props.ui ?? defaultUi;

    if (language !== "html" || ui.controls.code.preview === false) {
      return null;
    } else {
      return (
        <Tooltip
          ref={vm.tippyFullScreenRef}
          placement={"top"}
          touch={false}
          trigger={"mouseenter"}
          content={ui.translations.preview}
        >
          <button
            type="button"
            className="codeblock-icon-button first"
            aria-label={ui.translations.preview}
            onClick={(event) => {
              vm.openPreviewCode(event);
            }}
          >
            <span className="button-content">
              <span
                className="button-icon play"
                dangerouslySetInnerHTML={{
                  __html: ui.icons.run,
                }}
              />
            </span>
          </button>
        </Tooltip>
      );
    }
  }

  override componentWillUnmount() {
    const vm = this;
    vm.stopWatchingScroll?.();
  }

  override render() {
    let tippyCopyTxt;
    let iconFullScreen;
    let labelFullScreen;

    const vm = this;
    const props = vm.props;

    const PreviewButtonComponent = vm.previewButtonComponent;

    const ui = props.ui ?? defaultUi;
    const { translations, icons } = ui;
    const controls = ui.controls.code;

    tippyCopyTxt = translations.codeCopied;

    if (props.stream === true) {
      tippyCopyTxt = translations.codePartiallyCopied;
    }

    // The one button reads as two states: the icon and its name change
    // together, so the tooltip never says "Full screen" over a minimize icon.
    if (props.fullscreen === true) {
      iconFullScreen = icons.minimize;
      labelFullScreen = translations.exitFullScreen;
    } else {
      iconFullScreen = icons.maximize;
      labelFullScreen = translations.fullScreen;
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
            {controls.copy === false ? null : (
              <Tooltip
                ref={vm.tippyCopyContentRef}
                arrow={false}
                trigger={"manual"}
                placement={"top"}
                content={tippyCopyTxt}
              >
                <span className="tippy-button">
                  <Tooltip
                    placement={"top"}
                    content={translations.copyCode}
                    touch={false}
                    trigger={"mouseenter"}
                  >
                    <button
                      type="button"
                      className="codeblock-icon-button first"
                      aria-label={translations.copyCode}
                      onClick={vm.copyContent}
                    >
                      <span className="button-content">
                        <span
                          className="button-icon"
                          dangerouslySetInnerHTML={{
                            __html: icons.copy,
                          }}
                        />
                      </span>
                    </button>
                  </Tooltip>
                </span>
              </Tooltip>
            )}
            {controls.fullscreen === false ? null : (
              <Tooltip
                ref={vm.tippyFullScreenRef}
                placement={"top-end"}
                touch={false}
                trigger={"mouseenter"}
                content={labelFullScreen}
              >
                <button
                  type="button"
                  className="codeblock-icon-button last"
                  aria-label={labelFullScreen}
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
              </Tooltip>
            )}
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

export default Header;
