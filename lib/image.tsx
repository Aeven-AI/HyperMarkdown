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
        {/*
          Defaults for images a document author does not control: deferred and
          off-thread decoding keep a long answer's images from blocking the
          render, and no referrer is sent, so the page a reader is on is not
          disclosed to whatever host the markdown pointed at.
        */}
        <img
          className="image"
          src={src}
          alt={alt ?? ""}
          title={title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      </span>
    </span>
  );
}

// Re-renders only when the source changes, as the class did.
const MemoMarkdownImage = memo(
  MarkdownImage,
  (prev, next) => prev.src === next.src,
);

MemoMarkdownImage.displayName = "MarkdownImage";

export default MemoMarkdownImage;
