import { memo } from "react";

interface ImageProps {
  src?: string;
  alt?: string;
  title?: string;
  [key: string]: unknown;
}

/**
 * Images rendered from markdown, wrapped so a host can style loading and error
 * states around them.
 */
function MarkdownImg(props: ImageProps) {
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
const MemoMarkdownImg = memo(
  MarkdownImg,
  (prev, next) => prev.src === next.src
);

MemoMarkdownImg.displayName = "MarkdownImg";

export default MemoMarkdownImg;
