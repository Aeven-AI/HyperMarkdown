import type { DiagramEngine, DiagramPlugin } from "../plugin-types";

/**
 * Mermaid's own defaults assume it owns the page. These do not.
 *
 * `startOnLoad` would have it scan the document and render diagrams behind the
 * component's back; `suppressErrorRendering` stops a half-written diagram —
 * which is every diagram, while one streams — from painting an error graphic
 * into the page.
 */
const REQUIRED: Record<string, unknown> = {
  startOnLoad: false,
  suppressErrorRendering: true,
};

const DEFAULTS: Record<string, unknown> = {
  securityLevel: "strict",
  theme: "neutral",
};

/**
 * Diagrams through Mermaid. Requires `mermaid`.
 *
 * Mermaid is the largest thing this package can pull in — several megabytes —
 * so it is imported on the first diagram rather than at module load, and a
 * document with no diagrams never pays for it. Nothing needs to preload it:
 * the component asks for it exactly when a diagram appears.
 *
 * @param config - Mermaid configuration. Merged over sensible defaults, except
 *   for the two settings that would let it interfere with the page.
 */
export function mermaidPlugin(
  config: Record<string, unknown> = {},
): DiagramPlugin {
  let engine: DiagramEngine | null = null;
  let pending: Promise<DiagramEngine> | null = null;

  return {
    type: "diagram",
    name: "mermaid",
    language: "mermaid",

    loaded() {
      return engine;
    },

    load() {
      if (engine) {
        return Promise.resolve(engine);
      }

      if (!pending) {
        pending = import("mermaid")
          .then((module) => {
            const loaded = (module.default ??
              module) as unknown as DiagramEngine;

            loaded.initialize({ ...DEFAULTS, ...config, ...REQUIRED });

            engine = loaded;
            return engine;
          })
          .catch((error) => {
            // Let a later diagram try again rather than failing for the rest
            // of the session on one bad network moment.
            pending = null;
            throw error;
          });
      }

      return pending;
    },
  };
}

export default mermaidPlugin;
