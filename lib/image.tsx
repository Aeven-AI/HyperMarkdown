import { memo, type ImgHTMLAttributes } from "react";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  renderer?: unknown;
  scrollDown?: unknown;
}

/**
 * Images rendered from markdown, wrapped so a host can style loading and error
 * states around them.
 */
function MarkdownImage(props: ImageProps) {
  const { src, alt, title } = props;

  return (
    <span className="markdown-image-container">
      <span className="markdown-image">
        <span className="image-error" />
        <span className="image-loader" />
        <img className="image" src={src} alt={alt ?? ""} title={title} />
      </span>
    </span>
  );
}

// Re-renders only when the source changes, as the class did.
const MemoMarkdownImage = memo(
  MarkdownImage,
  (prev, next) => prev.src === next.src
);

MemoMarkdownImage.displayName = "MarkdownImage";

export default MemoMarkdownImage;
