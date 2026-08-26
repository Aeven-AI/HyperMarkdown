import type { DiagramEngine, DiagramPlugin } from "../plugin-types";

/**
 * Diagrams through Mermaid. Requires `mermaid`.
 *
 * Mermaid is the largest thing this package can pull in, so it is imported
 * dynamically on the first diagram rather than at module load. Everything
 * before that point costs nothing.
 */
export function mermaidPlugin(): DiagramPlugin {
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
        pending = import("mermaid").then((module) => {
          engine = (module.default ?? module) as unknown as DiagramEngine;
          return engine;
        });
      }

      return pending;
    },
  };
}

export default mermaidPlugin;
