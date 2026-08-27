/**
 * Start the faces used above the fold and wait briefly before mounting React.
 * The matching preload links in index.html let the HTML parser begin fetching
 * them before this module graph is ready.
 */
const FONT_TIMEOUT = 3000;
const FONT_FACES = [
  // One entry per family covers every weight: both Geist cuts are variable.
  '450 16px "Geist"',
  '450 16px "Geist Mono"',
  '400 20.5px "KaTeX_Main"',
  'italic 400 20.5px "KaTeX_Math"',
  '400 20.5px "KaTeX_Size1"',
  '400 20.5px "KaTeX_Size2"',
  '400 20.5px "KaTeX_Size3"',
];

export function preloadFonts() {
  let loading;
  let timeout;
  let timeoutId;

  if (!document.fonts?.load) {
    return Promise.resolve();
  }

  loading = Promise.allSettled(
    FONT_FACES.map((fontFace) => document.fonts.load(fontFace)),
  );
  timeout = new Promise((resolve) => {
    timeoutId = window.setTimeout(resolve, FONT_TIMEOUT);
  });

  return Promise.race([loading, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}
