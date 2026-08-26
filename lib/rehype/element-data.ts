import { visit } from "unist-util-visit";

import type { Root as HastRoot } from "hast";
import type { VFile } from "vfile";

/**
 * Stamp extra props onto every element of a given tag, as named by the file's
 * `rehypeData`. Lets a caller push props into elements it does not build.
 */
export function rehypeData() {
  const dataKey = "rehypeData";

  return (tree: HastRoot, file: VFile) => {
    let tagName;
    let propsToAdd: Record<string, unknown>;
    let propsByTagName: Record<string, Record<string, unknown>>;

    const data = file.data as typeof file.data & {
      rehypeData?: Record<string, Record<string, unknown>>;
    };

    if (!data[dataKey]) {
      return;
    }

    propsByTagName = data[dataKey];

    for (tagName in propsByTagName) {
      if (Object.prototype.hasOwnProperty.call(propsByTagName, tagName)) {
        propsToAdd = propsByTagName[tagName] ?? {};

        visit(tree, { tagName }, (node) => {
          if (!node.properties) {
            node.properties = {};
          }

          Object.assign(node.properties, propsToAdd);
        });
      }
    }
  };
}
