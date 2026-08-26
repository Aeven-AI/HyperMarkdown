import React, { Component } from "react";
import Tippy from "./Tippy";

class MarkdownImg extends Component<any, any> {
  [key: string]: any;

  constructor(props) {
    super(props);

    this.openGallery = this.openGallery.bind(this);
  }

  componentDidMount() {
    const vm = this;
    console.log("IMAGE MOUNTED");
    console.log(vm.props);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const vm = this;

    if (vm.props.src !== nextProps.src) {
      return true;
    } else {
      return false;
    }
  }

  openGallery(event) {
    event.preventDefault();
    event.stopPropagation();

    const vm = this;
    const props = vm.props;

    console.log("OPEN GALLERY", props);
  }

  render() {
    const vm = this;
    const props = vm.props;

    return (
      <span className="markdown-image-container">
        <span className="markdown-image">
          <span className="image-error"></span>
          <span className="image-loader"></span>

          <img className="image" src={props.src} onClick={vm.openGallery} />
        </span>
      </span>
    );
  }
}

export default MarkdownImg;
