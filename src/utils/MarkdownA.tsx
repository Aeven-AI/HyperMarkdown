import React, { Component, PureComponent } from "react";

import * as runtime from "./runtime";


class MarkdownA extends Component<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);
    this.offset = 100;
  }

  shouldComponentUpdate(nextProps, nextState) {
    const vm = this;

    if (vm.props.href !== nextProps.href) {
      return true;
    } else {
      return false;
    }
  }

  render() {
    let id;
    let value;
    let children;

    const vm = this;
    const props = vm.props;
    const { renderer: _, scrollDown: __, ...restProps } = props;
    const comProps: Record<string, any> = { ...restProps };

    const dataFootnoteRef = props["data-footnote-ref"];
    const dataFootnoteBackref = props["data-footnote-backref"];

    if (dataFootnoteRef !== "" && dataFootnoteBackref !== "") {
      return (
        <a target="_blank" rel="noreferrer" {...comProps}>
          {comProps.children}
        </a>
      );
    } else {
      if (dataFootnoteRef !== "") {
        children = comProps.children;

        comProps.href = runtime.currentPath() + "/" + comProps.href;
      } else {
        children = comProps.children;

        comProps.href = runtime.currentPath() + "/" + comProps.href;

        id = comProps.id;
        value = id.replace("user-content-fnref-", "");

        if (!children || !children.type) {
          if (value != children) {
            children = value;
          }
        } else {
          if (children.type === "span") {
            const current = children.props && children.props.children;
            if (value != current) {
              children = React.cloneElement(children, children.props, value);
            }
          } else if (Array.isArray(children)) {
            const first = children[0];
            if (first && first.type === "span") {
              const current = first.props && first.props.children;
              if (value != current) {
                children = [
                  React.cloneElement(first, first.props, value),
                  ...children.slice(1),
                ];
              }
            }
          }
        }
      }

      return (
        <a
          {...comProps}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            const href = props.href;
            window.location.hash = href;
          }}
        >
          {children}
        </a>
      );
    }
  }
}

export default MarkdownA;
